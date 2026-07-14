import { Component, inject, signal, computed, ChangeDetectionStrategy, HostListener, ViewChild, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { CareoInfo } from '../retos/retos-careo/careo-info/careo-info';
import { RankingService } from '../../core/services/ranking.service';
import { CommonModule, SlicePipe } from '@angular/common';
import { DebateService } from '../../core/services/debate.service';

/* ── Tipos locales — mismo shape que CalendarioTorneo ── */
export interface EventoDebate {
  id                : string;
  titulo            : string;
  inicio            : string;
  fin               : string;
  tipo              : 'oficial' | 'retorika';
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
  fecha    : Date;
  esDelMes : boolean;
  esHoy    : boolean;
  eventos  : EventoDebate[];
}

interface LigaApi {
  id               : number;
  nombre           : string;
  descripcion      : string;
  acceso           : string;
  tipo             : string;
  papelFiera       : string;
  temaElegido      : string;
  debatesFrecuencia: string;
  debatesDia       : string;
  debatesHora      : string;
  fechaI           : string;
  fechaF           : string;
  maxParticipantes : number;
  status           : string;
  usuarios         : any[];
}

const API_BASE   = 'https://fiera.retorika.es';
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

@Component({
  selector        : 'app-home',
  standalone      : true,
  imports         : [RouterLink, CareoInfo, CommonModule, SlicePipe],
  templateUrl     : './home.html',
  styleUrl        : './home.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit {

  auth           = inject(AuthService);
  router         = inject(Router);
  http           = inject(HttpClient);
  rankingService = inject(RankingService);
  debateService  = inject(DebateService);

  ngOnInit(): void {
    this.cargarRetoDelDia();
    this.cargarLigas();
  }

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

  /* ── Stats del usuario — desde AuthService ── */
  nivel   = computed(() => this.auth.usuario()?.nivel ?? '—');
  ranking = computed(() => this.auth.usuario()?.ranking ?? '—');
  puntos  = computed(() => this.auth.usuario()?.puntos ?? '—');

  /* ── Notificaciones hardcodeadas ── */
  readonly notificaciones = [
    { texto: 'Tu debate del martes ha sido confirmado',  tiempo: 'Hace 5 min',  leida: false },
    { texto: 'Ana Pastor te ha invitado a una liga',     tiempo: 'Hace 1 hora', leida: false },
    { texto: 'Nuevo reto disponible: IA en educación',   tiempo: 'Hace 3 horas',leida: true  },
    { texto: 'Subiste al puesto #18 en el ranking',      tiempo: 'Ayer',        leida: true  },
  ];

  get tieneNoLeidas(): boolean {
    return this.notificaciones.some(n => !n.leida);
  }

  /* ============================================================
     LIGAS REALES — GET /api/app/ligas
     Misma lógica de mapeo que CalendarioTorneo
  ============================================================ */
  eventosRetorika = signal<EventoDebate[]>([]);
  cargandoEventos = signal(false);
  errorEventos    = signal(false);

  private cargarLigas(): void {
    this.cargandoEventos.set(true);
    this.errorEventos.set(false);

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
        this.cargandoEventos.set(false);
      },
      error: (err) => {
        console.error('🔴 Error cargando ligas:', err);
        this.errorEventos.set(true);
        this.cargandoEventos.set(false);
      }
    });
  }

  /* ── Próximos 2 debates desde hoy ── */
  proximosDebates = computed<EventoDebate[]>(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return [...this.eventosRetorika()]
      .filter(e => e.inicio && new Date(e.inicio) >= hoy)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, 2);
  });

  /* ── Reto del día — tema real, cambia cada 24h para todos ── */
  retoDia = signal<{ pregunta: string; duracion: string }>({
    pregunta: 'Cargando reto del día...',
    duracion: '',
  });

  private cargarRetoDelDia(): void {
    this.debateService.getTemas().subscribe({
      next: temas => {
        const tema   = this.debateService.getTemaDelDia(temas);
        const tiempo = this.debateService.getTiempoPorTurnoDelDia();

        if (tema) {
          const minutosTotal = (tiempo * 4) / 60;
          this.retoDia.set({
            pregunta: tema.enunciado,
            duracion: `${minutosTotal} min`,
          });
        }
      },
      error: () => {}
    });
  }

  /* ============================================================
     MINI CALENDARIO — dropdown
     Misma lógica de construcción de cuadrícula que CalendarioTorneo
  ============================================================ */
  mesActual  = signal(new Date().getMonth());
  anioActual = signal(new Date().getFullYear());

  readonly diasSemana = DIAS_SEMANA;

  tituloMes = computed(() => `${MESES[this.mesActual()]} ${this.anioActual()}`);

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
    const eventos = this.eventosRetorika();

    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const fecha = new Date(anio, mes, -i);
      dias.push({ fecha, esDelMes: false, esHoy: false, eventos: [] });
    }

    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(anio, mes, d);
      fecha.setHours(0, 0, 0, 0);
      const esHoy = fecha.getTime() === hoy.getTime();
      const eventosDia = eventos.filter(e => {
        if (!e.inicio) return false;
        const inicio = new Date(e.inicio); inicio.setHours(0, 0, 0, 0);
        const fin    = new Date(e.fin);    fin.setHours(0, 0, 0, 0);
        return fecha >= inicio && fecha <= fin;
      });
      dias.push({ fecha, esDelMes: true, esHoy, eventos: eventosDia });
    }

    const totalCeldas = Math.ceil(dias.length / 7) * 7;
    let siguiente = 1;
    while (dias.length < totalCeldas) {
      const fecha = new Date(anio, mes + 1, siguiente++);
      dias.push({ fecha, esDelMes: false, esHoy: false, eventos: [] });
    }

    return dias;
  });

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

  /* ── Modal evento (desde mini calendario o lista de próximos) ── */
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
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  getMes(fecha: string): string {
    return new Date(fecha)
      .toLocaleDateString('es-ES', { month: 'short' })
      .toUpperCase();
  }

  plazasLibres(evento: EventoDebate): number {
    return (evento.maxParticipantes ?? 0) - (evento.inscritos ?? 0);
  }

  iniciales(usuario: Usuario): string {
    return `${usuario.nombre?.charAt(0) ?? ''}${usuario.apellidos?.charAt(0) ?? ''}`.toUpperCase();
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

  login(): void {
    this.errorLogin.set('');
    this.auth.login(this.emailValue, this.passwordValue).subscribe(resultado => {
      if (!resultado.ok) {
        this.errorLogin.set(resultado.error || '');
        return;
      }
      this.cerrarLogin();
    });
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
}
