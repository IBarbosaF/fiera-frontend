import {
  Component, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../core/services/auth.service';

export interface DebateHistorial {
  id        : string;
  tema      : string;
  fecha     : string;
  resultado : 'victoria' | 'derrota' | 'empate';
  puntuacion: number;
  dificultad: 'basico' | 'medio' | 'avanzado';
}

export interface Logro {
  id          : string;
  nombre      : string;
  descripcion : string;
  icono       : string;
  desbloqueado: boolean;
  fecha?      : string;
}

@Component({
  selector       : 'app-perfil',
  standalone     : true,
  templateUrl    : './perfil.html',
  styleUrl       : './perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil {

  private router      = inject(Router);
  private authService = inject(AuthService);

  usuario = this.authService.usuario;

  /* ── Avatar: iniciales o imagen de perfil ── */
  iniciales = computed(() => {
    const u = this.usuario();
    if (!u) return '?';
    return (u.nombre[0] + (u.apellidos?.[0] ?? '')).toUpperCase();
  });

  tieneImagen = computed(() => !!this.usuario()?.img_perfil);

  /* ── Nivel con fallback ── */
  nivelLabel = computed(() => this.usuario()?.nivel ?? 'Sin nivel');

  /* ── Subscripción con fallback ── */
  subLabel = computed(() => {
    const sub = this.usuario()?.subscripcion;
    if (!sub) return 'Gratuita';
    return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
  });

  /* ── Badge color subscripción ── */
  subClase = computed(() => {
    const sub = (this.usuario()?.subscripcion ?? '').toLowerCase();
    if (sub.includes('pro') || sub.includes('premium')) return 'sub--pro';
    if (sub.includes('club'))                            return 'sub--club';
    return 'sub--free';
  });

  /* ══════════════════════════════════════════
     MODAL EDITAR
  ══════════════════════════════════════════ */
  modalEditarAbierto = signal(false);
  modalTab           = signal<'datos' | 'password'>('datos');

  abrirModalEditar(): void {
    const u = this.usuario();
    if (!u) return;
    this.editNombre.set(u.nombre);
    this.editApellidos.set(u.apellidos);
    this.editEmail.set(u.email);
    this.editUsername.set(u.username ?? '');
    this.editPosicion.set(u.posicion ?? '');
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

  guardarDatos(): void {
    if (!this.editNombre() || !this.editApellidos() || !this.editEmail() || !this.editUsername()) {
      this.errorDatos.set('Nombre, apellidos, email y username son obligatorios.');
      return;
    }
    // TODO: PUT /api/app/usuarios/:id
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
        username : this.editUsername(),
        posicion : this.editPosicion() || null,
      };
      localStorage.setItem('fiera_users',  JSON.stringify(usuarios));
      localStorage.setItem('fiera_sesion', JSON.stringify(usuarios[idx]));
    }
    this.exitoDatos.set(true);
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
      this.errorPassword.set('Mínimo 6 caracteres.');
      return;
    }
    if (this.passNueva() !== this.passRepetir()) {
      this.errorPassword.set('Las contraseñas no coinciden.');
      return;
    }
    // TODO: PUT /api/app/usuarios/:id
    const usuarios: Usuario[] = JSON.parse(
      localStorage.getItem('fiera_users') ?? '[]'
    );
    const idx = usuarios.findIndex(x => x.email === u.email);
    if (idx !== -1) {
      usuarios[idx].password = this.passNueva();
      localStorage.setItem('fiera_users',  JSON.stringify(usuarios));
      localStorage.setItem('fiera_sesion', JSON.stringify(usuarios[idx]));
    }
    this.exitoPassword.set(true);
  }

  /* ══════════════════════════════════════════
     CV
  ══════════════════════════════════════════ */
  cvNombre = signal<string | null>(null);
  cvError  = signal('');

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
    this.cvNombre.set(file.name);
    this.cvError.set('');
  }

  eliminarCv(): void { this.cvNombre.set(null); }

  /* ══════════════════════════════════════════
     HISTORIAL (mock hasta API)
  ══════════════════════════════════════════ */
  historial: DebateHistorial[] = [
    { id: '1', tema: '¿Debe limitarse la IA en el arte?',          fecha: '14 jun 2025', resultado: 'victoria', puntuacion: 82, dificultad: 'medio'   },
    { id: '2', tema: 'El trabajo remoto mejora la productividad',   fecha: '10 jun 2025', resultado: 'derrota',  puntuacion: 61, dificultad: 'avanzado' },
    { id: '3', tema: 'La energía nuclear es la solución climática', fecha: '5 jun 2025',  resultado: 'victoria', puntuacion: 78, dificultad: 'basico'   },
    { id: '4', tema: '¿Las redes sociales dañan la democracia?',   fecha: '1 jun 2025',  resultado: 'empate',   puntuacion: 70, dificultad: 'medio'    },
  ];

  get totalDebates() {
    return this.historial.length;
  }

  /* ══════════════════════════════════════════
     LOGROS (mock hasta API)
  ══════════════════════════════════════════ */
  logros: Logro[] = [
    { id: 'primer-debate', nombre: 'Primera sangre',    descripcion: 'Completa tu primer debate',        icono: 'espada',  desbloqueado: true,  fecha: '1 jun 2025'  },
    { id: 'racha-3',       nombre: 'En racha',          descripcion: '3 victorias consecutivas',         icono: 'fuego',   desbloqueado: true,  fecha: '14 jun 2025' },
    { id: 'maestro-ref',   nombre: 'Maestro refutador', descripcion: 'Gana 5 debates en refutación',     icono: 'escudo',  desbloqueado: false  },
    { id: 'imbatible',     nombre: 'Imbatible',         descripcion: '10 victorias en modo avanzado',    icono: 'trofeo',  desbloqueado: false  },
    { id: 'velocista',     nombre: 'Velocista',         descripcion: 'Completa un debate express',       icono: 'rayo',    desbloqueado: true,  fecha: '10 jun 2025' },
    { id: 'explorador',    nombre: 'Explorador',        descripcion: 'Debate en 5 categorías distintas', icono: 'brujula', desbloqueado: false  },
  ];

  get logrosDesbloqueados(): number {
    return this.logros.filter(l => l.desbloqueado).length;
  }

  /* ══════════════════════════════════════════
     STATS desde usuario real
  ══════════════════════════════════════════ */
  get puntos()   { return this.usuario()?.puntos   ?? 0; }
  get ranking()  { return this.usuario()?.ranking  ?? '--'; }
  get experiencia() { return this.usuario()?.experiencia ?? 0; }

  /* Victorias/derrotas siguen siendo mock hasta API de debates */
  stats = {
    victorias       : 7,
    derrotas        : 4,
    empates         : 1,
    racha           : 3,
    horasEntrenadas : 8,
    mediaPuntos     : 74
   };

   get porcentajeVictorias() {
    if (!this.totalDebates) return 0;
    return Math.round((this.stats.victorias / this.totalDebates) * 100);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
