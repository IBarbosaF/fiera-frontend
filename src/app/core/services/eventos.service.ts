import { Injectable, signal, computed } from '@angular/core';

/* ============================================================
   EventosService — Gestión de eventos de debate
   Centraliza los datos de torneos y ligas.
   TODO: reemplazar mockdata con llamadas HTTP al backend
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
  fecha    : Date;
  esDelMes : boolean;
  esHoy    : boolean;
  eventos  : EventoDebate[];
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

@Injectable({ providedIn: 'root' })
export class EventosService {

  readonly diasSemana = DIAS_SEMANA;
  readonly meses      = MESES;

  /* ── Todos los eventos ── */
  getEventos(): EventoDebate[] {
    return MOCK_EVENTOS;
  }

  /* ── Próximos N eventos desde hoy ── */
  getProximos(n = 5, filtro: FiltroCalendario = 'todos'): EventoDebate[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return this.filtrar(filtro)
      .filter(e => new Date(e.inicio) >= hoy)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, n);
  }

  /* ── Filtrar por tipo ── */
  filtrar(filtro: FiltroCalendario): EventoDebate[] {
    if (filtro === 'oficiales') return MOCK_EVENTOS.filter(e => e.tipo === 'oficial');
    if (filtro === 'retorika')  return MOCK_EVENTOS.filter(e => e.tipo === 'retorika');
    return MOCK_EVENTOS;
  }

  /* ── Construir cuadrícula del mes ── */
  buildCalendario(mes: number, anio: number, filtro: FiltroCalendario = 'todos'): DiaCalendario[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;

    const dias: DiaCalendario[] = [];
    const eventosFiltrados = this.filtrar(filtro);

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
      const eventos = eventosFiltrados.filter(e => {
        const inicio = new Date(e.inicio); inicio.setHours(0, 0, 0, 0);
        const fin    = new Date(e.fin);    fin.setHours(0, 0, 0, 0);
        return fecha >= inicio && fecha <= fin;
      });
      dias.push({ fecha, esDelMes: true, esHoy, eventos });
    }

    // Completar cuadrícula
    const totalCeldas = Math.ceil(dias.length / 7) * 7;
    let siguiente = 1;
    while (dias.length < totalCeldas) {
      const fecha = new Date(anio, mes + 1, siguiente++);
      dias.push({ fecha, esDelMes: false, esHoy: false, eventos: [] });
    }

    return dias;
  }

  /* ── Helpers ── */
  tituloMes(mes: number, anio: number): string {
    return `${MESES[mes]} ${anio}`;
  }

  getDia(fecha: string): string {
    return new Date(fecha).getDate().toString();
  }

  getMes(fecha: string): string {
    return new Date(fecha)
      .toLocaleDateString('es-ES', { month: 'short' })
      .toUpperCase();
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  plazasLibres(evento: EventoDebate): number {
    return (evento.maxInscritos ?? 0) - (evento.inscritos ?? 0);
  }
}
