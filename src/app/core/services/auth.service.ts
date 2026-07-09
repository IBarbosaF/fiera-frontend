import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

/* ============================================================
   AuthService — Gestión de autenticación con backend real

   Usa localStorage solo para persistir la sesión (tokens + usuario)
   entre recargas de página. La fuente de verdad es el backend.
============================================================ */

const API_BASE = 'https://fiera.retorika.es';

export interface Usuario {
  id?          : number;
  nombre       : string;
  apellidos    : string;
  email        : string;
  password     : string;
  username     : string;
  imgPerfil?   : string | null;
  rol?         : string | null;
  experiencia? : number | null;
  posicion?    : string | null;
  nivel?       : string | null;
  puntos?      : number | null;
  ranking?     : number | null;
  subscripcion?: string | null;
  // TODO: tipar el shape real de cada elemento cuando toquemos
  // historial/estadísticas/clubs a fondo — de momento any[] evita
  // bloquear el desarrollo sin perder la forma del objeto.
  coleccionVideos?    : any[] | null;
  debatesParticipados?: any[] | null;
  debatesCreados?     : any[] | null;
  resultados?         : any[] | null;
  retos?              : any[] | null;
  ligas?              : any[] | null;
  torneos?            : any[] | null;
  clubs?              : any[] | null;
  clubesAdministrados?: any[] | null;
  clubesCreados?      : any[] | null;
  temas?              : any[] | null;
}

export interface AuthResponse {
  accessToken?  : string;
  refreshToken? : string;
  usuario?      : Usuario;
}

const STORAGE_SESION        = 'fiera_sesion';
const STORAGE_ACCESS_TOKEN  = 'fiera_access_token';
const STORAGE_REFRESH_TOKEN = 'fiera_refresh_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  /* Signal del usuario activo — null si no hay sesión */
  private _usuario = signal<Usuario | null>(this.obtenerSesion());

  /* Computed público: true si hay sesión activa */
  estaLogueado = computed(() => this._usuario() !== null);

  /* Usuario actual accesible desde cualquier componente */
  usuario = this._usuario.asReadonly();

  /* ----------------------------------------------------------
     obtenerSesion()
     Lee el usuario activo del localStorage
  ---------------------------------------------------------- */
  private obtenerSesion(): Usuario | null {
    const datos = localStorage.getItem(STORAGE_SESION);
    return datos ? JSON.parse(datos) : null;
  }

  /* ----------------------------------------------------------
     registrar()
     Registra un nuevo usuario en el backend.
     El endpoint espera multipart/form-data con un campo 'usuario'
     (JSON stringificado) y un campo 'imagen' (archivo opcional).
  ---------------------------------------------------------- */
  registrar(datos: Usuario, imagen?: File | null): Observable<{ ok: boolean; error?: string }> {
    if (!datos.nombre || !datos.apellidos || !datos.email || !datos.password || !datos.username) {
      return of({ ok: false, error: 'Rellena todos los campos.' });
    }

    if (datos.password.length < 6) {
      return of({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const formData = new FormData();
    formData.append('usuario', new Blob([JSON.stringify({
      ...datos,
      email: datos.email.toLowerCase()
    })], { type: 'application/json' }));

    if (imagen) {
      formData.append('imagen', imagen);
    }

    return this.http.post<AuthResponse | Usuario>(`${API_BASE}/api/auth/register`, formData).pipe(
      tap((res: any) => {
        console.log('🔵 Respuesta del backend al registrar:', res);
        const usuarioCreado = res.data.usuario;
        const accessToken   = res.data.tokenResponse?.accessToken;
        const refreshToken  = res.data.tokenResponse?.refreshToken;
        this.activarSesion(usuarioCreado, accessToken, refreshToken);
      }),
      switchMap(() => of({ ok: true })),
      catchError(err => {
        const mensaje = err?.error?.message || 'Error al registrar. Inténtalo de nuevo.';
        return of({ ok: false, error: mensaje });
      })
    );
  }

  /* ----------------------------------------------------------
   actualizarClub()
   Asocia un club al usuario recién registrado.
   PUT /api/auth/update/{id} — multipart/form-data,
   mandamos solo el campo 'clubs' con el club elegido.
  ---------------------------------------------------------- */
  actualizarClub(userId: number, clubId: number): Observable<boolean> {
    const formData = new FormData();
    formData.append('usuario', new Blob([JSON.stringify({
      clubs: [{ id: clubId }]
    })], { type: 'application/json' }));

    return this.http.put<any>(`${API_BASE}/api/auth/update/${userId}`, formData).pipe(
      tap(res => {
        console.log('🟠 Respuesta al actualizar club:', res);
        /* Si el backend devuelve el usuario actualizado, refrescamos la sesión */
        const usuarioActualizado = res?.data?.usuario ?? res?.data ?? null;
        if (usuarioActualizado) {
          const actual = this._usuario();
          this._usuario.set({ ...actual, ...usuarioActualizado });
          localStorage.setItem(STORAGE_SESION, JSON.stringify({ ...actual, ...usuarioActualizado }));
        }
      }),
      switchMap(() => of(true)),
      catchError(err => {
        console.error('🔴 Error al actualizar club:', err);
        return of(false);
      })
    );
  }

  /* ----------------------------------------------------------
     actualizarUsuario()
     Actualiza cualquier subconjunto de campos del usuario.
     PUT /api/auth/update/{id} — multipart/form-data,
     mismo patrón que actualizarClub().
     Si el backend devuelve el usuario actualizado, refresca
     la sesión activa automáticamente.
  ---------------------------------------------------------- */
  actualizarUsuario(userId: number, cambios: Partial<Usuario>): Observable<{ ok: boolean; error?: string }> {
    const formData = new FormData();
    formData.append('usuario', new Blob([JSON.stringify(cambios)], { type: 'application/json' }));

    return this.http.put<any>(`${API_BASE}/api/auth/update/${userId}`, formData).pipe(
      tap(res => {
        console.log('🟠 Respuesta al actualizar usuario:', res);
        const usuarioActualizado = res?.data?.usuario ?? res?.data ?? null;
        if (usuarioActualizado) {
          const actual = this._usuario();
          const fusionado = { ...actual, ...usuarioActualizado };
          this._usuario.set(fusionado);
          localStorage.setItem(STORAGE_SESION, JSON.stringify(fusionado));
        }
      }),
      switchMap(() => of({ ok: true })),
      catchError(err => {
        console.error('🔴 Error al actualizar usuario:', err);
        const mensaje = err?.error?.message || 'Error al guardar los cambios.';
        return of({ ok: false, error: mensaje });
      })
    );
  }

  /* ----------------------------------------------------------
     login()
     Autentica contra el backend, guarda los tokens y busca
     el perfil completo del usuario en la lista general
     comparando por email (el que el usuario escribió al loguearse).
  ---------------------------------------------------------- */
  login(email: string, password: string): Observable<{ ok: boolean; error?: string }> {
    if (!email || !password) {
      return of({ ok: false, error: 'Introduce email y contraseña.' });
    }

    const emailNormalizado = email.toLowerCase();

    return this.http.post<any>(`${API_BASE}/api/auth/login`, {
      email   : emailNormalizado,
      password
    }).pipe(
      switchMap(res => {
        const accessToken  = res.data?.accessToken;
        const refreshToken = res.data?.refreshToken;

        localStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken ?? '');
        localStorage.setItem(STORAGE_REFRESH_TOKEN, refreshToken ?? '');

        const headers = { Authorization: `Bearer ${accessToken}` };

        return this.http.get<Usuario[]>(`${API_BASE}/api/app/usuarios`, { headers }).pipe(
          tap(usuarios => {
            const usuarioCompleto = usuarios.find(
              u => u.email?.toLowerCase() === emailNormalizado
            );
            console.log('🟢 usuario encontrado por email:', usuarioCompleto);
            console.log('🔑 password recibida:', usuarioCompleto?.password, '| longitud:', usuarioCompleto?.password?.length);
            if (usuarioCompleto) this.activarSesion(usuarioCompleto);
          }),
          switchMap(() => of({ ok: true }))
        );
      }),
      catchError(err => {
        const mensaje = err?.status === 401
          ? 'Email o contraseña incorrectos.'
          : (err?.error?.message || 'Error al iniciar sesión.');
        return of({ ok: false, error: mensaje });
      })
    );
  }

  /* ----------------------------------------------------------
     refrescarUsuario()
     Vuelve a pedir los datos del usuario actual al backend
     y actualiza la sesión. Útil al entrar a pantallas como
     Perfil, donde queremos datos frescos (puntos, ranking,
     nivel, etc.) y no solo lo que quedó cacheado en login.

     Reutiliza GET /api/app/usuarios + filtro por id, ya que
     es el mismo patrón verificado en login().
  ---------------------------------------------------------- */
  refrescarUsuario(): Observable<boolean> {
    const actual = this._usuario();
    if (!actual?.id) {
      return of(false);
    }

    return this.http.get<Usuario[]>(`${API_BASE}/api/app/usuarios`).pipe(
      tap(usuarios => {
        const usuarioActualizado = usuarios.find(u => u.id === actual.id);
        if (usuarioActualizado) {
          this._usuario.set(usuarioActualizado);
          localStorage.setItem(STORAGE_SESION, JSON.stringify(usuarioActualizado));
        }
      }),
      switchMap(() => of(true)),
      catchError(err => {
        console.error('🔴 Error al refrescar usuario:', err);
        return of(false);
      })
    );
  }

  /* ----------------------------------------------------------
     refrescarToken()
     Pide un nuevo accessToken usando el refreshToken guardado.
     La usa el interceptor cuando el backend devuelve 401.
     Si falla, cierra sesión (el refreshToken ya no es válido).
  ---------------------------------------------------------- */
  refrescarToken(): Observable<boolean> {
    const refreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN);
    if (!refreshToken) {
      this.cerrarSesion();
      return of(false);
    }

    return this.http.post<any>(`${API_BASE}/api/auth/refresh`, { refreshToken }).pipe(
      switchMap(res => {
        const nuevoAccessToken  = res.data?.accessToken;
        const nuevoRefreshToken = res.data?.refreshToken;

        if (!nuevoAccessToken) {
          this.cerrarSesion();
          return of(false);
        }

        localStorage.setItem(STORAGE_ACCESS_TOKEN, nuevoAccessToken);
        if (nuevoRefreshToken) {
          localStorage.setItem(STORAGE_REFRESH_TOKEN, nuevoRefreshToken);
        }
        return of(true);
      }),
      catchError(() => {
        this.cerrarSesion();
        return of(false);
      })
    );
  }

  /* ----------------------------------------------------------
     cerrarSesion()
     Elimina la sesión activa
     TODO: llamar a POST /api/auth/logout cuando sea necesario
  ---------------------------------------------------------- */
  cerrarSesion(): void {
    localStorage.removeItem(STORAGE_SESION);
    localStorage.removeItem(STORAGE_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_REFRESH_TOKEN);
    this._usuario.set(null);
  }

  /* ----------------------------------------------------------
     activarSesion()
     Guarda el usuario y los tokens en localStorage y actualiza el signal
  ---------------------------------------------------------- */
  private activarSesion(usuario: Usuario, accessToken?: string, refreshToken?: string): void {
    localStorage.setItem(STORAGE_SESION, JSON.stringify(usuario));
    if (accessToken)  localStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_REFRESH_TOKEN, refreshToken);
    this._usuario.set(usuario);
  }

  /* ----------------------------------------------------------
     getAccessToken()
     Devuelve el token guardado — lo usaremos en un interceptor
     HTTP más adelante para autenticar las peticiones al backend.
  ---------------------------------------------------------- */
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_ACCESS_TOKEN);
  }
}
