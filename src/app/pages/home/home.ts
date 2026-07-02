import { Component, inject, signal, computed, ChangeDetectionStrategy, HostListener, ViewChild } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CareoInfo } from '../careo/careo-info/careo-info';
import {
  EventosService,
  EventoDebate,
  DiaCalendario
} from '../../core/services/eventos.service';
import { CommonModule, SlicePipe } from '@angular/common';

@Component({
  selector        : 'app-home',
  standalone      : true,
  imports         : [RouterLink, CareoInfo, CommonModule, SlicePipe],
  templateUrl     : './home.html',
  styleUrl        : './home.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})

export class Home {

  auth           = inject(AuthService);
  router         = inject(Router);
  eventosService = inject(EventosService);

  /* ── Modales ── */
  modalLoginAbierto     = signal(false);
  modalCareoInfoAbierto = signal(false);
  dropdownNotifAbierto  = signal(false);
  dropdownCalAbierto    = signal(false);

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

  /* ── Próximos debates — desde EventosService ── */
  proximosDebates = computed<EventoDebate[]>(() =>
    this.eventosService.getProximos(2)
  );

  /* ── Ranking hardcodeado ── */
  readonly topRanking = [
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

  /* ============================================================
     MINI CALENDARIO — dropdown
  ============================================================ */
  mesActual  = signal(new Date().getMonth());
  anioActual = signal(new Date().getFullYear());

  readonly diasSemana = this.eventosService.diasSemana;

  tituloMes = computed(() =>
    this.eventosService.tituloMes(this.mesActual(), this.anioActual())
  );

  diasCalendario = computed<DiaCalendario[]>(() =>
    this.eventosService.buildCalendario(this.mesActual(), this.anioActual())
  );

  mesAnteriorCal(event: MouseEvent): void {
    event.stopPropagation();
    if (this.mesActual() === 0) {
      this.mesActual.set(11);
      this.anioActual.update(a => a - 1);
    } else {
      this.mesActual.update(m => m - 1);
    }
  }

  mesSiguienteCal(event: MouseEvent): void {
    event.stopPropagation();
    if (this.mesActual() === 11) {
      this.mesActual.set(0);
      this.anioActual.update(a => a + 1);
    } else {
      this.mesActual.update(m => m + 1);
    }
  }

  /* ── Modal evento (desde mini calendario) ── */
  eventoSeleccionado = signal<EventoDebate | null>(null);
  modalEventoAbierto  = signal(false);

  abrirModalEvento(evento: EventoDebate, event: MouseEvent): void {
    event.stopPropagation();
    this.eventoSeleccionado.set(evento);
    this.modalEventoAbierto.set(true);
  }

  abrirModalEventoDirecto(evento: EventoDebate): void {
    this.eventoSeleccionado.set(evento);
    this.modalEventoAbierto.set(true);
  }

  cerrarModalEvento(): void {
    this.modalEventoAbierto.set(false);
    this.eventoSeleccionado.set(null);
  }

  cerrarModalEventoFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalEvento();
    }
  }

  formatearFecha(fecha: string): string {
    return this.eventosService.formatearFecha(fecha);
  }

  plazasLibres(evento: EventoDebate): number {
    return this.eventosService.plazasLibres(evento);
  }

  /* ----------------------------------------------------------
     Dropdowns — notificaciones y calendario
  ---------------------------------------------------------- */
  toggleNotif(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownNotifAbierto.update(v => !v);
    this.dropdownCalAbierto.set(false);
  }

  toggleCalendario(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownCalAbierto.update(v => !v);
    this.dropdownNotifAbierto.set(false);
  }

  @ViewChild(CareoInfo) careoInfo!: CareoInfo;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dropdownNotifAbierto.set(false);
    this.dropdownCalAbierto.set(false);
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

  /* ----------------------------------------------------------
     Modal Careo Info
  ---------------------------------------------------------- */
  abrirCareoInfo(): void {
    this.careoInfo.abrir();
  }

  cerrarCareoInfo(): void {
    this.modalCareoInfoAbierto.set(false);
  }

  cerrarCareoInfoFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarCareoInfo();
    }
  }
}
