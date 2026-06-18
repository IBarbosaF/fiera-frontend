import {
  Component, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { DebateService } from '../../core/services/debate.service';

/* ============================================================
   Perfil — Página de perfil del usuario

   Secciones (cards apiladas en dashboard):
   1. Hero card        → avatar generado, nombre, email, nivel
   2. Datos personales → editar nombre, apellidos, email
   3. Estadísticas     → debates, victorias, racha, media
   4. Historial        → últimos debates (mock hasta integrar API)
   5. Logros / badges  → achievements desbloqueados
   6. CV               → subida de archivo PDF
   7. Ajustes cuenta   → cambiar contraseña
============================================================ */

/* Historial de debate (mock hasta tener API) */
export interface DebateHistorial {
  id       : string;
  tema     : string;
  fecha    : string;
  resultado: 'victoria' | 'derrota' | 'empate';
  puntuacion: number;
  dificultad: 'basico' | 'medio' | 'avanzado';
}

/* Badge / logro */
export interface Logro {
  id         : string;
  nombre     : string;
  descripcion: string;
  icono      : string;       // nombre semántico para el @if
  desbloqueado: boolean;
  fecha?     : string;
}

@Component({
  selector        : 'app-perfil',
  standalone      : true,
  templateUrl     : './perfil.html',
  styleUrl        : './perfil.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class Perfil {

  private router       = inject(Router);
  private authService  = inject(AuthService);
  private debateService = inject(DebateService);

  /* Usuario actual */
  usuario = this.authService.usuario;

  /* ── Iniciales para avatar generado ── */
  iniciales = computed(() => {
    const u = this.usuario();
    if (!u) return '?';
    return (u.nombre[0] + (u.apellidos?.[0] ?? '')).toUpperCase();
  });

  /* ── Sección activa en edición ── */
  seccionEditando = signal<'datos' | 'password' | null>(null);

  /* ── EDITAR DATOS PERSONALES ── */
  editNombre    = signal('');
  editApellidos = signal('');
  editEmail     = signal('');
  errorDatos    = signal('');
  exitoDatos    = signal(false);

  abrirEditarDatos(): void {
    const u = this.usuario();
    if (!u) return;
    this.editNombre.set(u.nombre);
    this.editApellidos.set(u.apellidos);
    this.editEmail.set(u.email);
    this.errorDatos.set('');
    this.exitoDatos.set(false);
    this.seccionEditando.set('datos');
  }

  guardarDatos(): void {
    if (!this.editNombre() || !this.editApellidos() || !this.editEmail()) {
      this.errorDatos.set('Todos los campos son obligatorios.');
      return;
    }
    // TODO: conectar con backend (PUT /api/app/usuarios/:id)
    // Por ahora actualiza localStorage
    const usuarios: Usuario[] = JSON.parse(
      localStorage.getItem('fiera_users') ?? '[]'
    );
    const u = this.usuario();
    if (!u) return;
    const idx = usuarios.findIndex(x => x.email === u.email);
    if (idx !== -1) {
      usuarios[idx] = {
        ...usuarios[idx],
        nombre   : this.editNombre(),
        apellidos: this.editApellidos(),
        email    : this.editEmail().toLowerCase(),
      };
      localStorage.setItem('fiera_users', JSON.stringify(usuarios));
      localStorage.setItem('fiera_sesion', JSON.stringify(usuarios[idx]));
    }
    this.exitoDatos.set(true);
    this.seccionEditando.set(null);
  }

  cancelarEdicion(): void {
    this.seccionEditando.set(null);
    this.errorDatos.set('');
    this.errorPassword.set('');
  }

  /* ── CAMBIAR CONTRASEÑA ── */
  passActual   = signal('');
  passNueva    = signal('');
  passRepetir  = signal('');
  verPassActual  = signal(false);
  verPassNueva   = signal(false);
  verPassRepetir = signal(false);
  errorPassword  = signal('');
  exitoPassword  = signal(false);

  abrirCambiarPassword(): void {
    this.passActual.set('');
    this.passNueva.set('');
    this.passRepetir.set('');
    this.errorPassword.set('');
    this.exitoPassword.set(false);
    this.seccionEditando.set('password');
  }

  guardarPassword(): void {
    const u = this.usuario();
    if (!u) return;
    if (!this.passActual() || !this.passNueva() || !this.passRepetir()) {
      this.errorPassword.set('Completa todos los campos.');
      return;
    }
    if (u.password !== this.passActual()) {
      this.errorPassword.set('La contraseña actual es incorrecta.');
      return;
    }
    if (this.passNueva().length < 6) {
      this.errorPassword.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.passNueva() !== this.passRepetir()) {
      this.errorPassword.set('Las contraseñas no coinciden.');
      return;
    }
    // TODO: conectar con backend
    const usuarios: Usuario[] = JSON.parse(
      localStorage.getItem('fiera_users') ?? '[]'
    );
    const idx = usuarios.findIndex(x => x.email === u.email);
    if (idx !== -1) {
      usuarios[idx].password = this.passNueva();
      localStorage.setItem('fiera_users', JSON.stringify(usuarios));
      localStorage.setItem('fiera_sesion', JSON.stringify(usuarios[idx]));
    }
    this.exitoPassword.set(true);
  }

  /* ── CV ── */
  cvNombre  = signal<string | null>(null);
  cvError   = signal('');

  /* ── MODAL EDITAR ── */
  modalEditarAbierto = signal(false);
  modalTab           = signal<'datos' | 'password'>('datos');

  subirCv(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.cvError.set('Solo se admiten archivos PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.cvError.set('El archivo no puede superar los 5 MB.');
      return;
    }
    // TODO: subir al backend
    this.cvNombre.set(file.name);
    this.cvError.set('');
  }

  eliminarCv(): void {
    this.cvNombre.set(null);
  }

  /* ── ESTADÍSTICAS (mock hasta API) ── */
  stats = {
    totalDebates : 12,
    victorias    : 7,
    derrotas     : 4,
    empates      : 1,
    racha        : 3,
    mediaPuntos  : 74,
    horasEntrenadas: 8,
  };

  get porcentajeVictorias(): number {
    if (this.stats.totalDebates === 0) return 0;
    return Math.round((this.stats.victorias / this.stats.totalDebates) * 100);
  }

  /* ── HISTORIAL (mock hasta API) ── */
  historial: DebateHistorial[] = [
    { id: '1', tema: '¿Debe limitarse la IA en el arte?',        fecha: '14 jun 2025', resultado: 'victoria', puntuacion: 82, dificultad: 'medio'    },
    { id: '2', tema: 'El trabajo remoto mejora la productividad', fecha: '10 jun 2025', resultado: 'derrota',  puntuacion: 61, dificultad: 'avanzado'  },
    { id: '3', tema: 'La energía nuclear es la solución climática', fecha: '5 jun 2025', resultado: 'victoria', puntuacion: 78, dificultad: 'basico'   },
    { id: '4', tema: '¿Las redes sociales dañan la democracia?',  fecha: '1 jun 2025', resultado: 'empate',   puntuacion: 70, dificultad: 'medio'    },
  ];

  /* ── LOGROS (mock hasta API) ── */
  logros: Logro[] = [
    { id: 'primer-debate',  nombre: 'Primera sangre',    descripcion: 'Completa tu primer debate',          icono: 'espada',   desbloqueado: true,  fecha: '1 jun 2025' },
    { id: 'racha-3',        nombre: 'En racha',          descripcion: '3 victorias consecutivas',           icono: 'fuego',    desbloqueado: true,  fecha: '14 jun 2025' },
    { id: 'maestro-ref',    nombre: 'Maestro refutador', descripcion: 'Gana 5 debates en refutación',       icono: 'escudo',   desbloqueado: false  },
    { id: 'imbatible',      nombre: 'Imbatible',         descripcion: '10 victorias en modo avanzado',      icono: 'trofeo',   desbloqueado: false  },
    { id: 'velocista',      nombre: 'Velocista',         descripcion: 'Completa un debate express',         icono: 'rayo',     desbloqueado: true,  fecha: '10 jun 2025' },
    { id: 'explorador',     nombre: 'Explorador',        descripcion: 'Debate en 5 categorías distintas',   icono: 'brujula',  desbloqueado: false  },
  ];

  get logrosDesbloqueados(): number {
    return this.logros.filter(l => l.desbloqueado).length;
  }

  /* ── Navegación ── */
  irADebate(): void {
    this.router.navigate(['/configurar']);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }

  abrirModalEditar(): void {
    const u = this.usuario();
    if (!u) return;
    this.editNombre.set(u.nombre);
    this.editApellidos.set(u.apellidos);
    this.editEmail.set(u.email);
    this.passActual.set('');
    this.passNueva.set('');
    this.passRepetir.set('');
    this.errorDatos.set('');
    this.errorPassword.set('');
    this.exitoDatos.set(false);
    this.exitoPassword.set(false);
    this.modalTab.set('datos');
    this.modalEditarAbierto.set(true);
  }

  cerrarModal(): void {
  this.modalEditarAbierto.set(false);
  this.errorDatos.set('');
  this.errorPassword.set('');
  }

  cerrarModalAlClickarFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('perfil-modal-overlay')) {
      this.cerrarModal();
    }
  }
}
