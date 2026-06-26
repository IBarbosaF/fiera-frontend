import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

/* ============================================================
   CalendarioTorneo — Calendario de torneos y ligas
   Calendario mensual construido en Angular puro con signals
============================================================ */

export type FiltroCalendario = 'todos' | 'oficiales' | 'retorika';
export type TipoEvento       = 'oficial' | 'retorika';

export interface EventoDebate {
  id                : string;
  titulo            : string;
  inicio            : string;
  fin               : string;
  tipo              : TipoEvento;
  organizador       : string;
  pais              : string;
  ciudad            : string;
  descripcion       : string;
  inscritos?        : number;
  maxInscritos?     : number;
  normas?           : string;
  inscripcionAbierta?: boolean;
}

export interface DiaCalendario {
  fecha       : Date;
  esDelMes    : boolean;
  esHoy       : boolean;
  eventos     : EventoDebate[];
}

/* ── Mockdata ── */
// TODO: reemplazar con llamada al backend
const MOCK_EVENTOS: EventoDebate[] = [
  {
    id         : '1',
    titulo     : 'Torneo Nacional Karl Popper',
    inicio     : '2026-07-12',
    fin        : '2026-07-13',
    tipo       : 'oficial',
    organizador: 'Asociación Española de Debate',
    pais       : 'España',
    ciudad     : 'Madrid',
    descripcion: 'Torneo nacional de debate en formato Karl Popper. Inscripción a través de la web oficial de la AED.',
  },
  {
    id         : '2',
    titulo     : 'Copa Hispana de Debate',
    inicio     : '2026-07-19',
    fin        : '2026-07-20',
    tipo       : 'oficial',
    organizador: 'Club de Debate Universidad de Sevilla',
    pais       : 'España',
    ciudad     : 'Sevilla',
    descripcion: 'Competición universitaria con equipos de toda España. Formato parliamentary.',
  },
  {
    id         : '3',
    titulo     : 'IV Torneo Parlamentario Barcelona',
    inicio     : '2026-08-03',
    fin        : '2026-08-04',
    tipo       : 'oficial',
    organizador: 'Club de Debate UB',
    pais       : 'España',
    ciudad     : 'Barcelona',
    descripcion: 'Torneo de debate parlamentario con equipos nacionales e internacionales.',
  },
  {
    id                : '4',
    titulo            : 'Liga Retorika — Ronda 4',
    inicio            : '2026-07-05',
    fin               : '2026-07-05',
    tipo              : 'retorika',
    organizador       : 'Retorika',
    pais              : 'España',
    ciudad            : 'Online',
    descripcion       : 'Cuarta ronda de la Liga oficial de Retorika. Formato académico 4 turnos.',
    inscritos         : 12,
    maxInscritos      : 16,
    normas            : 'Formato académico estándar. Cada equipo de 2 personas. Turnos de 4 minutos.',
    inscripcionAbierta: true,
  },
  {
    id                : '5',
    titulo            : 'Entrenamiento Abierto Retorika',
    inicio            : '2026-07-10',
    fin               : '2026-07-10',
    tipo              : 'retorika',
    organizador       : 'Retorika',
    pais              : 'España',
    ciudad            : 'Online',
    descripcion       : 'Sesión de entrenamiento abierta para todos los miembros de la comunidad.',
    inscritos         : 5,
    maxInscritos      : 20,
    normas            : 'Formato libre. Abierto a todos los niveles.',
    inscripcionAbierta: true,
  },
  {
    id                : '6',
    titulo            : 'Liga Novatos — Ronda 2',
    inicio            : '2026-07-24',
    fin               : '2026-07-24',
    tipo              : 'retorika',
    organizador       : 'Club Debate CEU',
    pais              : 'España',
    ciudad            : 'Online',
    descripcion       : 'Segunda ronda de la liga para debatientes con menos de 1 año de experiencia.',
    inscritos         : 8,
    maxInscritos      : 12,
    normas            : 'Formato Karl Popper simplificado. Turnos de 3 minutos.',
    inscripcionAbierta: false,
  },
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

@Component({
  selector        : 'app-calendario-torneo',
  standalone      : true,
  imports         : [CommonModule],
  templateUrl     : './calendario-torneo.html',
  styleUrl        : './calendario-torneo.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class CalendarioTorneo {

  /* ── Estado ── */
  filtro             = signal<FiltroCalendario>('todos');
  mesActual          = signal(new Date().getMonth());
  anioActual         = signal(new Date().getFullYear());
  eventoSeleccionado = signal<EventoDebate | null>(null);
  modalAbierto       = signal(false);
  notifAbierto       = signal(false);
  notifSeleccionada  = signal<string>('1dia');

  readonly diasSemana = DIAS_SEMANA;

  /* ── Stats ── */
  readonly totalTorneos   = MOCK_EVENTOS.filter(e => e.tipo === 'oficial').length;
  readonly ligasRetorika  = MOCK_EVENTOS.filter(e => e.tipo === 'retorika').length;

  torneosEsteMes = computed(() => {
    const mes = this.mesActual();
    const anio = this.anioActual();
    return MOCK_EVENTOS.filter(e => {
      const d = new Date(e.inicio);
      return d.getMonth() === mes && d.getFullYear() === anio;
    }).length;
  });

  /* ── Título del mes ── */
  tituloMes = computed(() =>
    `${MESES[this.mesActual()]} ${this.anioActual()}`
  );

  /* ── Eventos filtrados ── */
  eventosFiltrados = computed<EventoDebate[]>(() => {
    const f = this.filtro();
    if (f === 'todos')     return MOCK_EVENTOS;
    if (f === 'oficiales') return MOCK_EVENTOS.filter(e => e.tipo === 'oficial');
    return MOCK_EVENTOS.filter(e => e.tipo === 'retorika');
  });

  /* ── Próximos eventos ── */
  proximosEventos = computed<EventoDebate[]>(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return [...this.eventosFiltrados()]
      .filter(e => new Date(e.inicio) >= hoy)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, 5);
  });

  /* ── Cuadrícula del calendario ── */
  diasCalendario = computed<DiaCalendario[]>(() => {
    const mes  = this.mesActual();
    const anio = this.anioActual();
    const hoy  = new Date();
    hoy.setHours(0, 0, 0, 0);

    const primerDia    = new Date(anio, mes, 1);
    const ultimoDia    = new Date(anio, mes + 1, 0);

    // Lunes = 0, ajuste europeo
    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;

    const dias: DiaCalendario[] = [];

    // Días del mes anterior
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const fecha = new Date(anio, mes, -i);
      dias.push({ fecha, esDelMes: false, esHoy: false, eventos: [] });
    }

    // Días del mes actual
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(anio, mes, d);
      fecha.setHours(0, 0, 0, 0);
      const esHoy = fecha.getTime() === hoy.getTime();
      const eventos = this.eventosFiltrados().filter(e => {
        const inicio = new Date(e.inicio);
        const fin    = new Date(e.fin);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(0, 0, 0, 0);
        return fecha >= inicio && fecha <= fin;
      });
      dias.push({ fecha, esDelMes: true, esHoy, eventos });
    }

    // Días del mes siguiente para completar la cuadrícula
    const totalCeldas = Math.ceil(dias.length / 7) * 7;
    let siguiente = 1;
    while (dias.length < totalCeldas) {
      const fecha = new Date(anio, mes + 1, siguiente++);
      dias.push({ fecha, esDelMes: false, esHoy: false, eventos: [] });
    }

    return dias;
  });

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
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  getDia(fecha: string): string {
    return new Date(fecha).getDate().toString();
  }

  getMes(fecha: string): string {
    return new Date(fecha)
      .toLocaleDateString('es-ES', { month: 'short' })
      .toUpperCase();
  }

  plazasLibres(evento: EventoDebate): number {
    return (evento.maxInscritos ?? 0) - (evento.inscritos ?? 0);
  }

  notifLabel(): string {
    return this.opcionesNotif.find(o => o.valor === this.notifSeleccionada())?.label ?? '';
  }
}
