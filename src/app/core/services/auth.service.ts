import { Injectable, signal, computed } from '@angular/core';

/* ============================================================
   AuthService — Gestión de autenticación simulada

   Usa localStorage para simular sesiones sin backend.
   Usa signals de Angular 21 para el estado reactivo.
============================================================ */

export interface Usuario {
  id?          : number;
  nombre       : string;
  apellidos    : string;
  email        : string;
  password     : string;
  username     : string;
  img_perfil?  : string | null;
  experiencia? : number | null;
  posicion?    : string | null;
  nivel?       : string | null;
  puntos?      : number | null;
  ranking?     : number | null;
  subscripcion?: string | null;
}

const STORAGE_USUARIOS = 'fiera_users';
const STORAGE_SESION   = 'fiera_sesion';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

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
     Registra un nuevo usuario si el email no existe
  ---------------------------------------------------------- */
  registrar(datos: Usuario): { ok: boolean; error?: string } {
    if (!datos.nombre || !datos.apellidos || !datos.email || !datos.password || !datos.username) {
      return { ok: false, error: 'Rellena todos los campos.' };
    }

    if (datos.password.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const usuarios = this.obtenerUsuarios();
    const existe   = usuarios.find(u => u.email === datos.email.toLowerCase());

    if (existe) {
      return { ok: false, error: 'Este email ya está registrado.' };
    }

    const nuevoUsuario: Usuario = {
      ...datos,
      email: datos.email.toLowerCase()
    };

    usuarios.push(nuevoUsuario);
    localStorage.setItem(STORAGE_USUARIOS, JSON.stringify(usuarios));
    this.activarSesion(nuevoUsuario);

    return { ok: true };
  }

  /* ----------------------------------------------------------
     login()
     Comprueba credenciales y activa sesión si son correctas
  ---------------------------------------------------------- */
  login(email: string, password: string): { ok: boolean; error?: string } {
    if (!email || !password) {
      return { ok: false, error: 'Introduce email y contraseña.' };
    }

    const usuarios = this.obtenerUsuarios();
    const usuario  = usuarios.find(
      u => u.email === email.toLowerCase() && u.password === password
    );

    if (!usuario) {
      return { ok: false, error: 'Email o contraseña incorrectos.' };
    }

    this.activarSesion(usuario);
    return { ok: true };
  }

  /* ----------------------------------------------------------
     cerrarSesion()
     Elimina la sesión activa
  ---------------------------------------------------------- */
  cerrarSesion(): void {
    localStorage.removeItem(STORAGE_SESION);
    this._usuario.set(null);
  }

  /* ----------------------------------------------------------
     activarSesion()
     Guarda el usuario en localStorage y actualiza el signal
  ---------------------------------------------------------- */
  private activarSesion(usuario: Usuario): void {
    localStorage.setItem(STORAGE_SESION, JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

  /* ----------------------------------------------------------
     obtenerUsuarios()
     Devuelve el array de usuarios registrados
  ---------------------------------------------------------- */
  private obtenerUsuarios(): Usuario[] {
    const datos = localStorage.getItem(STORAGE_USUARIOS);
    return datos ? JSON.parse(datos) : [];
  }
}
