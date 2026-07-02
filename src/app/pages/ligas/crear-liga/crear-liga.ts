import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DebateService, TemaApi } from '../../../core/services/debate.service';
import {
  LigaService,
  TipoAcceso,
  TipoCompeticion,
  ModoPregunta,
  OrigenPregunta,
  RolFiera,
  FrecuenciaLiga,
  LimiteParticipantes,
} from '../../../core/services/liga.service';

/* ============================================================
   CrearLiga — Wizard de 8 pasos para crear una liga de debate

   1. Información básica   5. Pregunta a debatir
   2. Acceso               6. Papel de FIERA
   3. Tipo de competición  7. Reglas y fechas
   4. Estructura           8. Resumen

   Ruta standalone (fuera de MainLayout), igual que registro.

   Cada paso tiene su propio bloque comentado más abajo con:
   · signals computed que leen del LigaService
   · setters que escriben en el LigaService
   · listas de opciones (si el paso usa radio-cards)
   La validación de cada paso vive en validarPasoActual().
============================================================ */

@Component({
  selector        : 'app-crear-liga',
  standalone      : true,
  imports         : [RouterLink, DatePipe],
  templateUrl     : './crear-liga.html',
  styleUrl        : './crear-liga.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class CrearLiga {

  /* ── Servicios ── */
  ligaService   = inject(LigaService);
  debateService = inject(DebateService);
  router        = inject(Router);

  /* ── Acceso directo al config del servicio (usado en varios pasos) ── */
  config = this.ligaService.config;

  /* ── Stepper ── */
  pasoActual = signal<number>(1);
  readonly TOTAL_PASOS = 8;

  readonly NOMBRES_PASO = [
    'Información', 'Acceso', 'Tipo', 'Estructura',
    'Pregunta', 'FIERA', 'Reglas y fechas', 'Resumen',
  ];

  /* ── Errores ── */
  error = signal<string>('');


  /* ════════════════════════════════════════════
     PASO 1 — Información básica
     Campos: nombre, descripción (máx 200), imagen
  ════════════════════════════════════════════ */

  readonly DESCRIPCION_MAX = this.ligaService.DESCRIPCION_MAX_LEN;

  nombre      = computed(() => this.config().nombre);
  descripcion = computed(() => this.config().descripcion);
  imagen      = computed(() => this.config().imagen);

  descripcionLength = computed(() => this.descripcion().length);

  setNombre(valor: string): void {
    this.ligaService.actualizarConfig({ nombre: valor });
  }

  setDescripcion(valor: string): void {
    if (valor.length > this.DESCRIPCION_MAX) {
      valor = valor.slice(0, this.DESCRIPCION_MAX);
    }
    this.ligaService.actualizarConfig({ descripcion: valor });
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.ligaService.actualizarConfig({ imagen: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }

  eliminarImagen(): void {
    this.ligaService.actualizarConfig({ imagen: null });
  }


  /* ════════════════════════════════════════════
     PASO 2 — Acceso
     ¿Quién puede participar en la liga?
  ════════════════════════════════════════════ */

  acceso = computed(() => this.config().acceso);

  readonly OPCIONES_ACCESO: { valor: TipoAcceso; nombre: string; desc: string; icono: string }[] = [
    { valor: 'publica',          nombre: 'Pública',              desc: 'Cualquier usuario puede unirse.',                     icono: 'globo'   },
    { valor: 'privada',          nombre: 'Privada',               desc: 'Solo mediante invitación o código.',                 icono: 'candado' },
    { valor: 'clubes_invitados', nombre: 'Solo clubes invitados', desc: 'El organizador selecciona los clubes participantes.', icono: 'grupo'   },
  ];

  setAcceso(valor: TipoAcceso): void {
    this.ligaService.actualizarConfig({ acceso: valor });
  }


  /* ════════════════════════════════════════════
     PASO 3 — Tipo de competición
     Formato de los debates de la liga
  ════════════════════════════════════════════ */

  tipoCompeticion = computed(() => this.config().tipoCompeticion);

  readonly OPCIONES_TIPO_COMPETICION: { valor: TipoCompeticion; nombre: string; desc: string; icono: string }[] = [
    { valor: 'academico', nombre: 'Debate académico', desc: 'Liga de debates académicos entre equipos.', icono: 'grupo' },
    { valor: 'careo',     nombre: 'Careo (cara a cara)', desc: 'Debate 1 contra 1. Sin equipos.',         icono: 'vs'    },
  ];

  setTipoCompeticion(valor: TipoCompeticion): void {
    this.ligaService.actualizarConfig({ tipoCompeticion: valor });
  }


  /* ════════════════════════════════════════════
     PASO 4 — Estructura del debate
     Qué partes tendrá cada debate y su duración.
     Los minutos se ajustan de medio en medio (0.5).
  ════════════════════════════════════════════ */

  estructura = computed(() => this.config().estructura);

  toggleTurnoActivo(id: string): void {
    const turno = this.estructura().find(t => t.id === id);
    if (turno) this.ligaService.actualizarTurno(id, { activo: !turno.activo });
  }

  /** Redondea a 1 decimal para evitar arrastres de coma flotante (0.1 + 0.2...) */
  private redondearMedio(valor: number): number {
    return Math.round(valor * 2) / 2;
  }

  incrementarMinutos(id: string): void {
    const turno = this.estructura().find(t => t.id === id);
    if (turno) this.ligaService.actualizarTurno(id, { minutos: this.redondearMedio(turno.minutos + 0.5) });
  }

  decrementarMinutos(id: string): void {
    const turno = this.estructura().find(t => t.id === id);
    if (turno && turno.minutos > 0.5) {
      this.ligaService.actualizarTurno(id, { minutos: this.redondearMedio(turno.minutos - 0.5) });
    }
  }

  /** Formatea "3.5" → "3:30 min" y "4" → "4 min" para el HTML */
  formatMinutos(minutos: number): string {
    const enteros = Math.floor(minutos);
    const esMedio = minutos % 1 !== 0;
    return esMedio ? `${enteros}:30 min` : `${enteros} min`;
  }


  /* ════════════════════════════════════════════
     PASO 5 — Pregunta a debatir
     Cómo se define el tema de cada debate.
     "Escribir mi propia pregunta" → input manual.
     "Elegir del banco de preguntas" → carga real desde
     el backend (mismo endpoint que usa config-debate:
     GET /api/app/temas), no está hardcodeado.
  ════════════════════════════════════════════ */

  modoPregunta             = computed(() => this.config().modoPregunta);
  mismaPreguntaTodasRondas = computed(() => this.config().mismaPreguntaTodasRondas);
  origenPregunta           = computed(() => this.config().origenPregunta);
  pregunta                 = computed(() => this.config().pregunta);
  temaId                   = computed(() => this.config().temaId);

  setModoPregunta(valor: ModoPregunta): void {
    this.ligaService.actualizarConfig({ modoPregunta: valor });
  }

  setMismaPreguntaTodasRondas(valor: boolean): void {
    this.ligaService.actualizarConfig({ mismaPreguntaTodasRondas: valor });
  }

  setPreguntaManual(valor: string): void {
    /* Escribir a mano invalida cualquier tema elegido del banco */
    this.ligaService.actualizarConfig({ pregunta: valor, temaId: null });
  }

  /* ── Banco de preguntas (temas reales del backend) ── */
  temasBanco     = signal<TemaApi[]>([]);
  cargandoTemas  = signal(false);
  errorTemas     = signal(false);
  busquedaTema   = signal('');

  temasFiltrados = computed(() => {
    const q = this.busquedaTema().toLowerCase().trim();
    if (!q) return this.temasBanco();
    return this.temasBanco().filter(t =>
      t.enunciado.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q)
    );
  });

  setOrigenPregunta(valor: OrigenPregunta): void {
    this.ligaService.actualizarConfig({ origenPregunta: valor });

    /* Carga perezosa: solo pedimos los temas la primera vez que
       el usuario abre la pestaña "banco de preguntas". */
    if (valor === 'banco' && this.temasBanco().length === 0 && !this.cargandoTemas()) {
      this.cargarTemasBanco();
    }
  }

  cargarTemasBanco(): void {
    this.cargandoTemas.set(true);
    this.errorTemas.set(false);

    this.debateService.getTemas().subscribe({
      next: (temas) => {
        this.temasBanco.set(temas);
        this.cargandoTemas.set(false);
      },
      error: () => {
        this.errorTemas.set(true);
        this.cargandoTemas.set(false);
      }
    });
  }

  seleccionarTemaBanco(tema: TemaApi): void {
    this.ligaService.actualizarConfig({ pregunta: tema.enunciado, temaId: tema.id });
  }


  /* ════════════════════════════════════════════
     PASO 6 — Papel de FIERA
     Qué rol tendrá FIERA dentro de la liga
  ════════════════════════════════════════════ */

  rolFiera = computed(() => this.config().rolFiera);

  readonly OPCIONES_ROL_FIERA: { valor: RolFiera; nombre: string; desc: string; icono: string }[] = [
    { valor: 'juez',  nombre: 'FIERA actúa como juez', desc: 'FIERA evaluará los debates y asignará puntuaciones.', icono: 'balanza' },
    { valor: 'rival', nombre: 'Debates contra FIERA',  desc: 'Cada participante se enfrentará a FIERA en los debates.', icono: 'vs'    },
  ];

  setRolFiera(valor: RolFiera): void {
    this.ligaService.actualizarConfig({ rolFiera: valor });
  }


  /* ════════════════════════════════════════════
     PASO 7 — Reglas y fechas
     Calendario, frecuencia y límite de participantes
  ════════════════════════════════════════════ */

  numeroDebates          = computed(() => this.config().numeroDebates);
  frecuencia              = computed(() => this.config().frecuencia);
  diasSemana              = computed(() => this.config().diasSemana);
  hora                    = computed(() => this.config().hora);
  fechaInicio             = computed(() => this.config().fechaInicio);
  maxParticipantes        = computed(() => this.config().maxParticipantes);
  maxParticipantesCustom  = computed(() => this.config().maxParticipantesCustom);

  readonly DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly OPCIONES_FRECUENCIA: { valor: FrecuenciaLiga; label: string }[] = [
    { valor: 'semanal',   label: 'Semanal'   },
    { valor: 'quincenal', label: 'Quincenal' },
    { valor: 'mensual',   label: 'Mensual'   },
  ];

  /* Dropdown propio de frecuencia (no usamos <select> nativo porque
     su lista de opciones no se puede tematizar en oscuro de forma
     consistente entre navegadores). */
  frecuenciaAbierta = signal(false);

  toggleFrecuenciaDropdown(): void {
    this.frecuenciaAbierta.update(v => !v);
  }

  seleccionarFrecuencia(valor: FrecuenciaLiga): void {
    this.setFrecuencia(valor);
    this.frecuenciaAbierta.set(false);
  }

  readonly OPCIONES_MAX_PARTICIPANTES: { valor: LimiteParticipantes; label: string }[] = [
    { valor: 'sin_limite',   label: 'Sin límite'        },
    { valor: '8',            label: '8 participantes'   },
    { valor: '16',           label: '16 participantes'  },
    { valor: '32',           label: '32 participantes'  },
    { valor: 'personalizado', label: 'Personalizado'    },
  ];

  /* Días → duración aprox. entre debates, usado para estimar la fecha fin */
  private readonly DIAS_POR_FRECUENCIA: Record<FrecuenciaLiga, number> = {
    semanal  : 7,
    quincenal: 14,
    mensual  : 30,
  };

  /** Fecha fin estimada a partir de fechaInicio + (numeroDebates - 1) * frecuencia */
  fechaFinEstimada = computed<Date | null>(() => {
    const inicio = this.fechaInicio();
    if (!inicio) return null;

    const diasEntreDebates = this.DIAS_POR_FRECUENCIA[this.frecuencia()];
    const totalDias        = diasEntreDebates * (this.numeroDebates() - 1);

    const fecha = new Date(inicio);
    fecha.setDate(fecha.getDate() + totalDias);
    return fecha;
  });

  /** Texto "Duración aproximada: X semanas" que se muestra bajo las fechas */
  duracionAproxTexto = computed(() => {
    const diasEntreDebates = this.DIAS_POR_FRECUENCIA[this.frecuencia()];
    const totalDias        = diasEntreDebates * (this.numeroDebates() - 1);
    const semanas           = Math.max(1, Math.round(totalDias / 7));
    return `${semanas} semana${semanas === 1 ? '' : 's'}`;
  });

  incrementarDebates(): void {
    this.ligaService.actualizarConfig({ numeroDebates: this.numeroDebates() + 1 });
  }

  decrementarDebates(): void {
    if (this.numeroDebates() > 1) {
      this.ligaService.actualizarConfig({ numeroDebates: this.numeroDebates() - 1 });
    }
  }

  setFrecuencia(valor: FrecuenciaLiga): void {
    this.ligaService.actualizarConfig({ frecuencia: valor });
  }

  toggleDia(dia: string): void {
    this.ligaService.toggleDiaSemana(dia);
  }

  setHora(valor: string): void {
    this.ligaService.actualizarConfig({ hora: valor });
  }

  setFechaInicio(valor: string): void {
    this.ligaService.actualizarConfig({ fechaInicio: valor });
  }

  setMaxParticipantes(valor: LimiteParticipantes): void {
    this.ligaService.actualizarConfig({ maxParticipantes: valor });
  }

  setMaxParticipantesCustom(valor: string): void {
    const num = Number(valor);
    this.ligaService.actualizarConfig({ maxParticipantesCustom: isNaN(num) ? null : num });
  }


  /* ════════════════════════════════════════════
     PASO 8 — Resumen
     Solo lectura + datos mock (clasificación e insignias)
     hasta que exista backend de ligas.
  ════════════════════════════════════════════ */

  /* Etiquetas legibles para el resumen */
  accesoLabel = computed(() => {
    const op = this.OPCIONES_ACCESO.find(o => o.valor === this.acceso());
    return op?.nombre ?? '—';
  });

  tipoCompeticionLabel = computed(() => {
    const op = this.OPCIONES_TIPO_COMPETICION.find(o => o.valor === this.tipoCompeticion());
    return op?.nombre ?? '—';
  });

  rolFieraLabel = computed(() => {
    const op = this.OPCIONES_ROL_FIERA.find(o => o.valor === this.rolFiera());
    return op?.nombre ?? '—';
  });

  preguntaLabel = computed(() => {
    if (this.modoPregunta() === 'aleatoria') return 'Aleatoria (una por ronda)';
    const base = this.mismaPreguntaTodasRondas() ? 'Fija (misma en todos los debates)' : 'Fija (distinta por ronda)';
    return this.pregunta() ? `${base} — "${this.pregunta()}"` : base;
  });

  estructuraLabel = computed(() =>
    this.estructura()
      .filter(t => t.activo)
      .map(t => `${t.nombre} (${this.formatMinutos(t.minutos)})`)
      .join(' · ')
  );

  maxParticipantesLabel = computed(() => {
    if (this.maxParticipantes() === 'sin_limite') return 'Sin límite';
    if (this.maxParticipantes() === 'personalizado') return `${this.maxParticipantesCustom() ?? '—'} participantes`;
    return `${this.maxParticipantes()} participantes`;
  });

  frecuenciaLabel = computed(() => {
    const op = this.OPCIONES_FRECUENCIA.find(o => o.valor === this.frecuencia());
    return op?.label ?? '—';
  });

  /* ── Datos mock del Resumen (Paso 8) ──
     La tabla de clasificación se ha quitado del HTML del resumen
     a petición — de momento no se muestra en ningún sitio, pero
     dejamos el array aquí listo para cuando decidamos dónde
     mostrarla (¿ficha pública de la liga una vez creada?). */
  readonly CLASIFICACION_MOCK = [
    { pos: 1, nombre: 'María López',    victorias: 6, derrotas: 2, puntos: 6, porcentaje: 75, rtk: 1650 },
    { pos: 2, nombre: 'Diego Ruiz',     victorias: 5, derrotas: 3, puntos: 5, porcentaje: 63, rtk: 1580 },
    { pos: 3, nombre: 'Laura Martínez', victorias: 5, derrotas: 3, puntos: 5, porcentaje: 63, rtk: 1540 },
    { pos: 4, nombre: 'Carlos Fernández', victorias: 4, derrotas: 4, puntos: 4, porcentaje: 50, rtk: 1500 },
    { pos: 5, nombre: 'Ana Gómez',      victorias: 3, derrotas: 5, puntos: 3, porcentaje: 38, rtk: 1460 },
  ];

  readonly INSIGNIAS_MOCK = [
    { nombre: 'Mejor orador',      icono: 'trofeo'  },
    { nombre: 'Mejor introductor', icono: 'medalla' },
    { nombre: 'Mejor refutador',   icono: 'escudo'  },
    { nombre: 'Mejor conclusor',   icono: 'copa'    },
    { nombre: 'Participante revelación', icono: 'estrella' },
  ];

  /* ----------------------------------------------------------
     finalizarCreacion()
     Botón "CREAR LIGA" del Paso 8. Llama al servicio (mock)
     y navega al hub de ligas.
  ---------------------------------------------------------- */
  finalizarCreacion(): void {
    const resultado = this.ligaService.crearLiga();
    if (resultado.ok) {
      this.router.navigate(['/ligas']);
    }
  }


  /* ════════════════════════════════════════════
     NAVEGACIÓN DEL WIZARD (stepper)
  ════════════════════════════════════════════ */

  irAPaso(paso: number): void {
    if (paso < this.pasoActual()) {
      this.error.set('');
      this.pasoActual.set(paso);
    }
  }

  siguiente(): void {
    this.error.set('');

    if (!this.validarPasoActual()) return;

    this.ligaService.guardarConfig();

    if (this.pasoActual() < this.TOTAL_PASOS) {
      this.pasoActual.set(this.pasoActual() + 1);
    }
  }

  anterior(): void {
    this.error.set('');
    if (this.pasoActual() > 1) {
      this.pasoActual.set(this.pasoActual() - 1);
    }
  }

  /** Botón "←" del header — siempre vuelve al hub de ligas */
  salir(): void {
    this.router.navigate(['/ligas']);
  }

  /* ── Validación por paso ──
     Añade aquí la validación de cada paso según se necesite. */
  private validarPasoActual(): boolean {
    switch (this.pasoActual()) {

      case 1:
        if (!this.nombre().trim()) {
          this.error.set('El nombre de la liga es obligatorio.');
          return false;
        }
        return true;

      case 2:
        if (!this.acceso()) {
          this.error.set('Selecciona un tipo de acceso.');
          return false;
        }
        return true;

      case 3:
        if (!this.tipoCompeticion()) {
          this.error.set('Selecciona el tipo de competición.');
          return false;
        }
        return true;

      case 4:
        if (!this.estructura().some(t => t.activo)) {
          this.error.set('Activa al menos un turno para la estructura del debate.');
          return false;
        }
        return true;

      case 5:
        if (this.modoPregunta() === 'fija' && !this.pregunta().trim()) {
          this.error.set(
            this.origenPregunta() === 'banco'
              ? 'Selecciona una pregunta del banco.'
              : 'Escribe la pregunta a debatir.'
          );
          return false;
        }
        return true;

      case 6:
        if (!this.rolFiera()) {
          this.error.set('Selecciona el papel de FIERA en la liga.');
          return false;
        }
        return true;

      case 7:
        if (!this.fechaInicio()) {
          this.error.set('Indica la fecha de inicio de la liga.');
          return false;
        }
        if (this.diasSemana().length === 0) {
          this.error.set('Selecciona al menos un día de la semana.');
          return false;
        }
        if (this.maxParticipantes() === 'personalizado' && !this.maxParticipantesCustom()) {
          this.error.set('Indica el número máximo de participantes.');
          return false;
        }
        return true;

      default:
        return true;
    }
  }
}
