import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  EventosService,
  EventoDebate,
  DiaCalendario,
  FiltroCalendario
} from '../../../core/services/eventos.service';

/* ============================================================
   CalendarioTorneo — Calendario de torneos y ligas
   Calendario mensual construido en Angular puro con signals.
   Los datos vienen de EventosService.
============================================================ */

@Component({
  selector        : 'app-calendario-torneo',
  standalone      : true,
  imports         : [CommonModule],
  templateUrl     : './calendario-torneo.html',
  styleUrl        : './calendario-torneo.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class CalendarioTorneo {

  private eventosService = inject(EventosService);

  /* ── Estado ── */
  filtro             = signal<FiltroCalendario>('todos');
  mesActual          = signal(new Date().getMonth());
  anioActual         = signal(new Date().getFullYear());
  eventoSeleccionado = signal<EventoDebate | null>(null);
  modalAbierto       = signal(false);
  notifAbierto       = signal(false);
  notifSeleccionada  = signal<string>('1dia');

  readonly diasSemana = this.eventosService.diasSemana;

  /* ── Stats ── */
  readonly totalTorneos  = this.eventosService.filtrar('oficiales').length;
  readonly ligasRetorika = this.eventosService.filtrar('retorika').length;

  torneosEsteMes = computed(() => {
    const mes  = this.mesActual();
    const anio = this.anioActual();
    return this.eventosService.getEventos().filter(e => {
      const d = new Date(e.inicio);
      return d.getMonth() === mes && d.getFullYear() === anio;
    }).length;
  });

  /* ── Título del mes ── */
  tituloMes = computed(() =>
    this.eventosService.tituloMes(this.mesActual(), this.anioActual())
  );

  /* ── Eventos filtrados ── */
  eventosFiltrados = computed<EventoDebate[]>(() =>
    this.eventosService.filtrar(this.filtro())
  );

  /* ── Próximos eventos ── */
  proximosEventos = computed<EventoDebate[]>(() =>
    this.eventosService.getProximos(5, this.filtro())
  );

  /* ── Cuadrícula del calendario ── */
  diasCalendario = computed<DiaCalendario[]>(() =>
    this.eventosService.buildCalendario(this.mesActual(), this.anioActual(), this.filtro())
  );

  /* ── Navegación ── */
  mesAnterior(): void {
    if (this.mesActual() === 0) {
      this.mesActual.set(11);
      this.anioActual.update(a => a - 1);
    } else {
      this.mesActual.update(m => m - 1);
    }
  }

  mesSiguiente(): void {
    if (this.mesActual() === 11) {
      this.mesActual.set(0);
      this.anioActual.update(a => a + 1);
    } else {
      this.mesActual.update(m => m + 1);
    }
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesActual.set(hoy.getMonth());
    this.anioActual.set(hoy.getFullYear());
  }

  /* ── Filtro ── */
  setFiltro(f: FiltroCalendario): void {
    this.filtro.set(f);
  }

  /* ── Modal ── */
  abrirModal(evento: EventoDebate, e: MouseEvent): void {
    e.stopPropagation();
    this.eventoSeleccionado.set(evento);
    this.modalAbierto.set(true);
  }

  abrirModalDirecto(evento: EventoDebate): void {
    this.eventoSeleccionado.set(evento);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.eventoSeleccionado.set(null);
  }

  cerrarModalFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
  }

  /* ── Notificaciones ── */
  readonly opcionesNotif = [
    { valor: '1dia',    label: '1 día antes'   },
    { valor: '3horas',  label: '3 horas antes' },
    { valor: '1hora',   label: '1 hora antes'  },
    { valor: 'momento', label: 'En el momento' },
  ];

  toggleNotif(e: MouseEvent): void {
    e.stopPropagation();
    this.notifAbierto.update(v => !v);
  }

  seleccionarNotif(valor: string): void {
    this.notifSeleccionada.set(valor);
    this.notifAbierto.set(false);
  }

  cerrarNotif(): void {
    this.notifAbierto.set(false);
  }

  /* ── Helpers ── */
  formatearFecha(fecha: string): string {
    return this.eventosService.formatearFecha(fecha);
  }

  getDia(fecha: string): string {
    return this.eventosService.getDia(fecha);
  }

  getMes(fecha: string): string {
    return this.eventosService.getMes(fecha);
  }

  plazasLibres(evento: EventoDebate): number {
    return this.eventosService.plazasLibres(evento);
  }

  notifLabel(): string {
    return this.opcionesNotif.find(o => o.valor === this.notifSeleccionada())?.label ?? '';
  }
}
