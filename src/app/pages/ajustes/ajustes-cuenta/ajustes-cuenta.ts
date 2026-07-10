import {
  Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/* ============================================================
   AjustesCuenta — Página completa (no modal) para gestionar
   los datos de la cuenta: foto de perfil, datos personales
   y contraseña.

   La lógica de datos/contraseña está migrada de perfil.ts;
   cuando esta página esté validada, se elimina el modal
   equivalente de Perfil.
============================================================ */
@Component({
  selector       : 'app-ajustes-cuenta',
  standalone     : true,
  imports        : [],
  templateUrl    : './ajustes-cuenta.html',
  styleUrl       : './ajustes-cuenta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AjustesCuenta implements OnInit, OnDestroy {

  private router      = inject(Router);
  private authService = inject(AuthService);

  usuario = this.authService.usuario;

  cargandoUsuario = signal(false);

  ngOnInit(): void {
    this.cargandoUsuario.set(true);
    this.authService.refrescarUsuario().subscribe(() => {
      this.cargandoUsuario.set(false);
    });

    const u = this.usuario();
    if (u) {
      this.editNombre.set(u.nombre);
      this.editApellidos.set(u.apellidos);
      this.editEmail.set(u.email);
      this.editUsername.set(u.username ?? '');
      this.editPosicion.set(u.posicion ?? '');
    }
  }

  ngOnDestroy(): void {
    /* Evita memory leak si el usuario navega fuera con una preview activa */
    this.limpiarPreview();
  }

  irAAjustes(): void {
    this.router.navigate(['/ajustes']);
  }

  /* ══════════════════════════════════════════
     AVATAR / FOTO DE PERFIL
  ══════════════════════════════════════════ */
  private readonly UPLOADS_BASE = 'https://fiera.retorika.es/uploads';

  iniciales = computed(() => {
    const u = this.usuario();
    if (!u) return '?';
    return (u.nombre[0] + (u.apellidos?.[0] ?? '')).toUpperCase();
  });

  tieneImagen = computed(() => !!this.usuario()?.imgPerfil);

  urlImagenPerfil = computed(() => {
    const nombreArchivo = this.usuario()?.imgPerfil;
    if (!nombreArchivo) return null;
    return `${this.UPLOADS_BASE}/${nombreArchivo}`;
  });

  fotoArchivo   = signal<File | null>(null);
  fotoPreview   = signal<string | null>(null);
  fotoError     = signal('');
  fotoExito     = signal(false);
  guardandoFoto = signal(false);

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.fotoError.set('Solo se admiten archivos de imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.fotoError.set('La imagen no puede superar los 5 MB.');
      return;
    }

    this.limpiarPreview();
    this.fotoError.set('');
    this.fotoExito.set(false);
    this.fotoArchivo.set(file);
    this.fotoPreview.set(URL.createObjectURL(file));

    /* Permite volver a elegir el mismo archivo tras cancelar */
    input.value = '';
  }

  guardarFoto(): void {
    const u = this.usuario();
    const archivo = this.fotoArchivo();
    if (!u?.id || !archivo) return;

    this.guardandoFoto.set(true);
    this.fotoError.set('');

    this.authService.actualizarUsuario(u.id, {}, archivo).subscribe(res => {
      this.guardandoFoto.set(false);
      if (res.ok) {
        this.fotoExito.set(true);
        this.cancelarFoto();
      } else {
        this.fotoError.set(res.error ?? 'Error al subir la foto.');
      }
    });
  }

  cancelarFoto(): void {
    this.limpiarPreview();
    this.fotoArchivo.set(null);
  }

  private limpiarPreview(): void {
    const url = this.fotoPreview();
    if (url) URL.revokeObjectURL(url);
    this.fotoPreview.set(null);
  }

  /* ══════════════════════════════════════════
     TABS
  ══════════════════════════════════════════ */
  tabActiva = signal<'datos' | 'password'>('datos');

  /* ══════════════════════════════════════════
     EDITAR DATOS PERSONALES
  ══════════════════════════════════════════ */
  editNombre    = signal('');
  editApellidos = signal('');
  editEmail     = signal('');
  editUsername  = signal('');
  editPosicion  = signal('');
  errorDatos    = signal('');
  exitoDatos    = signal(false);
  guardando     = signal(false);

  guardarDatos(): void {
    if (!this.editNombre() || !this.editApellidos() || !this.editEmail() || !this.editUsername()) {
      this.errorDatos.set('Nombre, apellidos, email y username son obligatorios.');
      return;
    }
    const u = this.usuario();
    if (!u?.id) {
      this.errorDatos.set('No se pudo identificar al usuario.');
      return;
    }

    this.errorDatos.set('');
    this.exitoDatos.set(false);
    this.guardando.set(true);

    this.authService.actualizarUsuario(u.id, {
      nombre   : this.editNombre(),
      apellidos: this.editApellidos(),
      email    : this.editEmail().toLowerCase(),
      username : this.editUsername(),
      posicion : this.editPosicion() || null,
    }).subscribe(res => {
      this.guardando.set(false);
      if (res.ok) {
        this.exitoDatos.set(true);
      } else {
        this.errorDatos.set(res.error ?? 'Error al guardar los cambios.');
      }
    });
  }

  /* ══════════════════════════════════════════
     CAMBIAR CONTRASEÑA
  ══════════════════════════════════════════ */
  passActual     = signal('');
  passNueva      = signal('');
  passRepetir    = signal('');
  verPassActual  = signal(false);
  verPassNueva   = signal(false);
  verPassRepetir = signal(false);
  errorPassword  = signal('');
  exitoPassword  = signal(false);

  guardarPassword(): void {
    const u = this.usuario();
    if (!u?.id) {
      this.errorPassword.set('No se pudo identificar al usuario.');
      return;
    }
    if (!this.passActual() || !this.passNueva() || !this.passRepetir()) {
      this.errorPassword.set('Completa todos los campos.');
      return;
    }
    if (this.passNueva().length < 6) {
      this.errorPassword.set('Mínimo 6 caracteres.');
      return;
    }
    if (this.passNueva() !== this.passRepetir()) {
      this.errorPassword.set('Las contraseñas no coinciden.');
      return;
    }

    this.errorPassword.set('');
    this.exitoPassword.set(false);
    this.guardando.set(true);

    // NOTA: PUT /api/auth/update/{id} NO valida la contraseña actual
    // (confirmado por Swagger). Bug de backend reportado a María Rosa.
    this.authService.actualizarUsuario(u.id, {
      password: this.passNueva()
    }).subscribe(res => {
      this.guardando.set(false);
      if (res.ok) {
        this.exitoPassword.set(true);
        this.passActual.set('');
        this.passNueva.set('');
        this.passRepetir.set('');
      } else {
        this.errorPassword.set(res.error ?? 'Error al cambiar la contraseña.');
      }
    });
  }
}
