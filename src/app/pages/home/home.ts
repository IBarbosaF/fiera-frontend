import { Component, inject, signal, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

export interface ProximoDebate {
  dia    : string;
  mes    : string;
  titulo : string;
  detalle: string;
  enDias : string;
  urgente: boolean;
}

export interface JugadorRanking {
  posicion: number;
  nombre  : string;
  puntos  : number;
  avatar  : string;
  eres_tu : boolean;
}

@Component({
  selector        : 'app-home',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './home.html',
  styleUrl        : './home.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Home {

  auth   = inject(AuthService);
  router = inject(Router);

  /* ── Modales ── */
  modalLoginAbierto    = signal(false);
  dropdownNotifAbierto = signal(false);

  /* ── Errores ── */
  errorLogin = signal('');

  /* ── Ojo contraseña ── */
  verPassword   = false;
  emailValue    = '';
  passwordValue = '';

  /* ── Stats hardcodeados ── */
  readonly nivel   = 'Intermedio';
  readonly ranking = 18;
  readonly puntos  = 2450;

  /* ── Notificaciones hardcodeadas ── */
  readonly notificaciones = [
    { texto: 'Tu debate del martes ha sido confirmado',  tiempo: 'Hace 5 min',  leida: false },
    { texto: 'Ana Pastor te ha invitado a una liga',     tiempo: 'Hace 1 hora', leida: false },
    { texto: 'Nuevo reto disponible: IA en educación',   tiempo: 'Hace 3 horas',leida: true  },
    { texto: 'Subiste al puesto #18 en el ranking',      tiempo: 'Ayer',        leida: true  },
  ];

  /* ── Próximos debates hardcodeados ── */
  readonly proximosDebates: ProximoDebate[] = [
    {
      dia    : '21',
      mes    : 'MAY',
      titulo : 'Liga Universitaria Madrid',
      detalle: 'Ronda 3 • 18:00',
      enDias : 'En 2 días',
      urgente: true,
    },
    {
      dia    : '24',
      mes    : 'MAY',
      titulo : 'Entrenamiento con compañeros',
      detalle: 'Sala privada • 17:00',
      enDias : 'En 5 días',
      urgente: false,
    },
  ];

  /* ── Ranking hardcodeado ── */
  readonly topRanking: JugadorRanking[] = [
    { posicion: 2, nombre: 'Ana Pastor', puntos: 2350, avatar: 'AP', eres_tu: false },
    { posicion: 1, nombre: 'Marcos L.',  puntos: 2980, avatar: 'ML', eres_tu: false },
    { posicion: 3, nombre: 'Lucía R.',   puntos: 2150, avatar: 'LR', eres_tu: false },
  ];

  /* ── Reto del día ── */
  readonly retoDia = {
    pregunta: '¿Deberían prohibirse los móviles en las aulas?',
    duracion: '5 min',
  };

  /* ── Notificaciones no leídas ── */
  get tieneNoLeidas(): boolean {
    return this.notificaciones.some(n => !n.leida);
  }

  /* ----------------------------------------------------------
     Dropdown notificaciones
  ---------------------------------------------------------- */
  toggleNotif(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownNotifAbierto.update(v => !v);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dropdownNotifAbierto.set(false);
  }

  /* ----------------------------------------------------------
     Modal login
  ---------------------------------------------------------- */
  abrirLogin(): void {
    this.errorLogin.set('');
    this.modalLoginAbierto.set(true);
  }

  cerrarLogin(): void {
    this.modalLoginAbierto.set(false);
    this.errorLogin.set('');
    this.emailValue    = '';
    this.passwordValue = '';
    this.verPassword   = false;
  }

  abrirRegistro(): void {
    this.router.navigate(['/registro']);
  }

  irARegistro(): void {
    this.cerrarLogin();
    this.router.navigate(['/registro']);
  }

  toggleVerPassword(): void {
    this.verPassword = !this.verPassword;
  }

  login(email: string, password: string): void {
    this.errorLogin.set('');
    const resultado = this.auth.login(email, password);
    if (!resultado.ok) {
      this.errorLogin.set(resultado.error || '');
      return;
    }
    this.cerrarLogin();
  }

  cerrarAlClickarFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarLogin();
    }
  }
}
