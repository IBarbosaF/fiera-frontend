import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient }   from '@angular/common/http';

/* ============================================================
   CalendarioTorneo — Calendario de torneos y ligas
   Calendario mensual construido en Angular puro con signals.
   - Torneos oficiales: mockdata (TODO: endpoint backend)
   - Ligas Retorika: datos reales de GET /api/app/ligas
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
  maxParticipantes? : number;
  normas?           : string;
  inscripcionAbierta?: boolean;
}

export interface DiaCalendario {
  fecha   : Date;
  esDelMes: boolean;
  esHoy   : boolean;
  eventos : EventoDebate[];
}

export interface LigaApi {
  id               : number;
  nombre           : string;
  descripcion      : string;
  imgUrl           : string | null;
  acceso           : string;
  tipo             : string;
  papelFiera       : string;
  temaElegido      : string;
  debatesNum       : number;
  debatesFrecuencia: string;
  debatesDia       : string;
  debatesHora      : string;
  fechaI           : string;
  fechaF           : string;
  maxParticipantes : number;
  insignias        : string[] | null;
  status           : string;
  tema             : any;
  usuarios         : any[];
  equipos          : any[];
  debates          : any[];
}

const API_BASE   = 'https://fiera.retorika.es';
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
export class CalendarioTorneo implements OnInit {

  private http = inject(HttpClient);
  private cdr  = inject(ChangeDetectorRef);

  /* ── Estado ── */
  filtro             = signal<FiltroCalendario>('todos');
  mesActual          = signal(new Date().getMonth());
  anioActual         = signal(new Date().getFullYear());
  eventoSeleccionado = signal<EventoDebate | null>(null);
  modalAbierto       = signal(false);
  notifAbierto       = signal(false);
  notifSeleccionada  = signal<string>('1dia');
  cargando           = signal(false);
  errorCarga         = signal(false);

  /* ── Eventos por origen ── */
  eventosOficiales = signal<EventoDebate[]>([]);
  eventosRetorika  = signal<EventoDebate[]>([]);

  readonly diasSemana = DIAS_SEMANA;

  /* ── Stats ── */
  totalTorneos  = computed(() => this.eventosOficiales().length);
  ligasRetorika = computed(() => this.eventosRetorika().length);

  torneosEsteMes = computed(() => {
    const mes  = this.mesActual();
    const anio = this.anioActual();
    return [...this.eventosOficiales(), ...this.eventosRetorika()].filter(e => {
      const d = new Date(e.inicio);
      return d.getMonth() === mes && d.getFullYear() === anio;
    }).length;
  });

  /* ── Título del mes ── */
  tituloMes = computed(() => `${MESES[this.mesActual()]} ${this.anioActual()}`);

  /* ── Eventos filtrados ── */
  eventosFiltrados = computed<EventoDebate[]>(() => {
    const f = this.filtro();
    if (f === 'oficiales') return this.eventosOficiales();
    if (f === 'retorika')  return this.eventosRetorika();
    return [...this.eventosOficiales(), ...this.eventosRetorika()];
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

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

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

    // Días del mes siguiente para completar cuadrícula
    const totalCeldas = Math.ceil(dias.length / 7) * 7;
    let siguiente = 1;
    while (dias.length < totalCeldas) {
      const fecha = new Date(anio, mes + 1, siguiente++);
      dias.push({ fecha, esDelMes: false, esHoy: false, eventos: [] });
    }

    return dias;
  });

  /* ── Carga inicial ── */
  ngOnInit(): void {
    this.cargarLigas();
  }

  private cargarLigas(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.http.get<any>(`${API_BASE}/api/app/ligas`).subscribe({
      next: (res) => {
        const ligas: LigaApi[] = Array.isArray(res) ? res : (res?.data ?? []);

        const eventos: EventoDebate[] = ligas.map(l => ({
          id                : String(l.id),
          titulo            : l.nombre,
          inicio            : l.fechaI?.split('T')[0] ?? '',
          fin               : l.fechaF?.split('T')[0] ?? l.fechaI?.split('T')[0] ?? '',
          tipo              : 'retorika' as const,
          organizador       : 'Retorika',
          pais              : 'España',
          ciudad            : l.debatesDia
                                ? `${l.debatesDia} · ${l.debatesHora?.substring(0, 5) ?? ''}`
                                : 'Online',
          descripcion       : l.descripcion
                                || (l.temaElegido ? `Tema: ${l.temaElegido}` : `Liga ${l.nombre}`),
          inscritos         : l.usuarios?.length ?? 0,
          maxParticipantes  : l.maxParticipantes,
          normas            : [
            l.debatesFrecuencia ? `Frecuencia: ${l.debatesFrecuencia}` : null,
            l.debatesDia        ? `Día: ${l.debatesDia}`               : null,
            l.debatesHora       ? `Hora: ${l.debatesHora}`             : null,
            l.tipo              ? `Tipo: ${l.tipo}`                    : null,
            l.papelFiera        ? `FIERA: ${l.papelFiera}`             : null,
          ].filter(Boolean).join('. ') + '.',
          inscripcionAbierta: l.acceso === 'PUBLICA' && l.status !== 'CERRADA',
        }));

        this.eventosRetorika.set(eventos);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('🔴 Error cargando ligas:', err);
        this.errorCarga.set(true);
        this.cargando.set(false);
        this.cdr.markForCheck();
      }
    });
  }

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

  /* ── Modal día ── */
  diaSeleccionado     = signal<DiaCalendario | null>(null);
  modalDiaAbierto     = signal(false);

  abrirModalDia(dia: DiaCalendario): void {
    if (dia.eventos.length === 0) return;
    this.diaSeleccionado.set(dia);
    this.modalDiaAbierto.set(true);
  }

  cerrarModalDia(): void {
    this.modalDiaAbierto.set(false);
    this.diaSeleccionado.set(null);
  }

  cerrarModalDiaFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalDia();
    }
  }

  abrirEventoDesdeModalDia(evento: EventoDebate): void {
    this.cerrarModalDia();
    setTimeout(() => {
      this.eventoSeleccionado.set(evento);
      this.modalAbierto.set(true);
    }, 150);
  }

  formatearFechaDia(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
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
    return (evento.maxParticipantes ?? 0) - (evento.inscritos ?? 0);
  }

  notifLabel(): string {
    return this.opcionesNotif.find(o => o.valor === this.notifSeleccionada())?.label ?? '';
  }
}
