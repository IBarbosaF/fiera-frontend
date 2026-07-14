import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
   CrearLiga — Wizard de 7 pasos para crear una liga de debate

   1. Información básica   5. Papel de FIERA
   2. Acceso               6. Reglas y fechas
   3. Tipo de competición  7. Resumen
   4. Pregunta a debatir

   Ruta standalone (fuera de MainLayout), igual que registro.

   NOTA: el antiguo "Paso 4 — Estructura del debate" (turnos e
   intervalos) se quitó porque el modelo Liga del backend no
   tiene ningún campo para eso — confirmado con el schema real.
   Ver comentario equivalente en liga.service.ts.

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
  private route = inject(ActivatedRoute);

  /* ── Modo edición ──
     Ruta /ligas/editar/:id reutiliza este mismo componente.
     Si hay :id en la URL, precargamos la liga real y el botón
     final pasa de "CREAR LIGA" (POST) a "GUARDAR CAMBIOS" (PUT). */
  ligaId = signal<number | null>(null);
  modoEdicion = computed(() => this.ligaId() !== null);

  cargandoLigaExistente = signal(false);
  errorCargaLiga        = signal('');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    const id = Number(idParam);
    if (isNaN(id)) return;

    this.ligaId.set(id);
    this.cargandoLigaExistente.set(true);
    this.ligaService.resetConfig();

    this.ligaService.obtenerLiga(id).subscribe({
      next: (liga) => {
        this.ligaService.cargarLigaEnConfig(liga);
        this.cargandoLigaExistente.set(false);
      },
      error: () => {
        this.errorCargaLiga.set('No se pudo cargar la liga. Vuelve al listado e inténtalo de nuevo.');
        this.cargandoLigaExistente.set(false);
      }
    });
  }

  /* ── Acceso directo al config del servicio (usado en varios pasos) ── */
  config = this.ligaService.config;

  /* ── Stepper ── */
  pasoActual = signal<number>(1);
  readonly TOTAL_PASOS = 7;

  readonly NOMBRES_PASO = [
    'Información', 'Acceso', 'Tipo', 'Pregunta',
    'FIERA', 'Reglas y fechas', 'Resumen',
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

  /** Preview a mostrar en el Paso 1: prioriza una imagen nueva
      recién seleccionada; si no hay, cae a la imagen ya guardada
      en el backend (solo aplica en modo edición). */
  imagenPreview = computed(() =>
    this.imagen() ?? this.ligaService.urlImagen(this.config().imagenOriginalUrl)
  );

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
    this.ligaService.actualizarConfig({ imagen: null, imagenOriginalUrl: null });
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
     PASO 4 — Pregunta a debatir
     Cómo se define el tema de cada debate.
     "Escribir mi propia pregunta" → input manual (temaElegido).
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
     PASO 5 — Papel de FIERA
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
     PASO 6 — Reglas y fechas
     Calendario, frecuencia, día único y aforo.

     El backend solo admite UN día de la semana por liga
     (campo "debatesDia": string) — de ahí que aquí sea
     selección única, no chips múltiples.
  ════════════════════════════════════════════ */

  numeroDebates          = computed(() => this.config().numeroDebates);
  frecuencia              = computed(() => this.config().frecuencia);
  diaSemana               = computed(() => this.config().diaSemana);
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

  readonly OPCIONES_MAX_PARTICIPANTES: { valor: LimiteParticipantes; label: string }[] = [
    { valor: 'sin_limite',   label: 'Sin límite'        },
    { valor: '8',            label: '8 participantes'   },
    { valor: '16',           label: '16 participantes'  },
    { valor: '32',           label: '32 participantes'  },
    { valor: 'personalizado', label: 'Personalizado'    },
  ];

  /** Fecha fin estimada — delega en LigaService.calcularFechaFin()
      para no duplicar la fórmula que también usa crearLiga(). */
  fechaFinEstimada = computed<Date | null>(() =>
    this.ligaService.calcularFechaFin(this.fechaInicio(), this.frecuencia(), this.numeroDebates())
  );

  /** Texto "Duración aproximada: X semanas" que se muestra bajo las fechas */
  duracionAproxTexto = computed(() => {
    const fin = this.fechaFinEstimada();
    if (!fin || !this.fechaInicio()) return '';
    const inicio = new Date(this.fechaInicio());
    const totalDias = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const semanas = Math.max(1, Math.round(totalDias / 7));
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

  setFrecuencia(valor: FrecuenciaLiga): void {
    this.ligaService.actualizarConfig({ frecuencia: valor });
  }

  /** Selección de un único día */
  setDiaSemana(dia: string): void {
    this.ligaService.actualizarConfig({ diaSemana: dia });
  }

  setHora(valor: string): void {
    this.ligaService.actualizarConfig({ hora: valor });
  }

  setMaxParticipantes(valor: LimiteParticipantes): void {
    this.ligaService.actualizarConfig({ maxParticipantes: valor });
  }

  setMaxParticipantesCustom(valor: string): void {
    const num = Number(valor);
    this.ligaService.actualizarConfig({ maxParticipantesCustom: isNaN(num) ? null : num });
  }

  /* ── Selector de fecha propio (sustituye a <input type="date">) ──
     El popup del calendario nativo del navegador es UI del sistema
     operativo y no se puede tematizar en oscuro, así que montamos
     uno propio con el mismo estilo que el resto de la app. */
  fechaInicioAbierta = signal(false);
  mesVisible         = signal<Date>(new Date());

  readonly DIAS_SEMANA_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  private readonly NOMBRES_MES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  mesVisibleLabel = computed(() => {
    const fecha = this.mesVisible();
    return `${this.NOMBRES_MES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  });

  fechaInicioDate = computed<Date | null>(() => {
    const iso = this.fechaInicio();
    return iso ? new Date(iso + 'T00:00:00') : null;
  });

  /** Texto del botón trigger, formato DD/MM/AAAA (o placeholder si no hay fecha) */
  fechaInicioLabel = computed(() => {
    const d = this.fechaInicioDate();
    if (!d) return 'dd/mm/aaaa';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  /** Cuadrícula de 42 días (6 semanas), empezando en lunes,
      incluye días de meses adyacentes (se pintan en gris). */
  diasCalendario = computed<Date[]>(() => {
    const mes = this.mesVisible();
    const primerDiaMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const offset = (primerDiaMes.getDay() + 6) % 7; // lunes = 0 ... domingo = 6

    const inicio = new Date(primerDiaMes);
    inicio.setDate(inicio.getDate() - offset);

    return Array.from({ length: 42 }, (_, i) => {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      return dia;
    });
  });

  setFechaInicio(valor: string): void {
    this.ligaService.actualizarConfig({ fechaInicio: valor });
  }

  toggleFechaInicioPicker(): void {
    if (!this.fechaInicioAbierta()) {
      this.mesVisible.set(this.fechaInicioDate() ?? new Date());
    }
    this.fechaInicioAbierta.update(v => !v);
  }

  mesAnterior(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  mesSiguiente(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  esMesActual(dia: Date): boolean {
    return dia.getMonth() === this.mesVisible().getMonth();
  }

  esHoy(dia: Date): boolean {
    return this.mismoDia(dia, new Date());
  }

  esSeleccionado(dia: Date): boolean {
    const sel = this.fechaInicioDate();
    return sel ? this.mismoDia(dia, sel) : false;
  }

  private mismoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
  }

  seleccionarDia(dia: Date): void {
    this.setFechaInicio(this.formatearISO(dia));
    this.fechaInicioAbierta.set(false);
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesVisible.set(hoy);
    this.setFechaInicio(this.formatearISO(hoy));
    this.fechaInicioAbierta.set(false);
  }

  borrarFechaInicio(): void {
    this.setFechaInicio('');
    this.fechaInicioAbierta.set(false);
  }

  private formatearISO(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }


  /* ════════════════════════════════════════════
     PASO 7 — Resumen
     Solo lectura + insignias mock (aún sin hueco en el
     modelo real más allá del array "insignias" del backend,
     que de momento no rellenamos al crear).
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

  maxParticipantesLabel = computed(() => {
    if (this.maxParticipantes() === 'sin_limite') return 'Sin límite';
    if (this.maxParticipantes() === 'personalizado') return `${this.maxParticipantesCustom() ?? '—'} participantes`;
    return `${this.maxParticipantes()} participantes`;
  });

  frecuenciaLabel = computed(() => {
    const op = this.OPCIONES_FRECUENCIA.find(o => o.valor === this.frecuencia());
    return op?.label ?? '—';
  });

  /* ── Insignias mock del Resumen (Paso 7) ──
     El backend tiene un array "insignias" en el modelo Liga,
     pero de momento no lo rellenamos al crear — solo es
     decorativo aquí hasta que definamos de dónde salen. */
  readonly INSIGNIAS_MOCK = [
    { nombre: 'Mejor orador',      icono: 'trofeo'  },
    { nombre: 'Mejor introductor', icono: 'medalla' },
    { nombre: 'Mejor refutador',   icono: 'escudo'  },
    { nombre: 'Mejor conclusor',   icono: 'copa'    },
    { nombre: 'Participante revelación', icono: 'estrella' },
  ];

  /* ── Textos dinámicos según modo crear/editar ── */
  tituloWizard    = computed(() => this.modoEdicion() ? 'Editar liga de debate' : 'Crear liga de debate');
  subtituloWizard = computed(() => this.modoEdicion()
    ? 'Actualiza los detalles de tu liga'
    : 'Configura todos los detalles para crear tu liga');
  textoBotonFinal    = computed(() => this.modoEdicion() ? 'GUARDAR CAMBIOS' : 'CREAR LIGA');
  textoBotonCargando = computed(() => this.modoEdicion() ? 'GUARDANDO...' : 'CREANDO...');

  /* ── Estado de creación (llamada real al backend) ── */
  creandoLiga    = signal(false);
  errorCreacion  = signal('');

  /* ----------------------------------------------------------
     finalizarCreacion()
     Botón final del Paso 7. En modo edición llama a PUT
     (actualizarLiga), si no a POST (crearLiga). Ver
     liga.service.ts para el mapeo completo de campos.
  ---------------------------------------------------------- */
  finalizarCreacion(): void {
    this.errorCreacion.set('');
    this.creandoLiga.set(true);

    const peticion = this.modoEdicion()
      ? this.ligaService.actualizarLiga(this.ligaId()!)
      : this.ligaService.crearLiga();

    peticion.subscribe({
      next: () => {
        this.creandoLiga.set(false);
        this.router.navigate(['/ligas']);
      },
      error: (err) => {
        this.creandoLiga.set(false);
        this.errorCreacion.set(
          err?.error?.message
          || (this.modoEdicion() ? 'No se pudieron guardar los cambios. Inténtalo de nuevo.' : 'No se pudo crear la liga. Inténtalo de nuevo.')
        );
      }
    });
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
        if (this.modoPregunta() === 'fija' && !this.pregunta().trim()) {
          this.error.set(
            this.origenPregunta() === 'banco'
              ? 'Selecciona una pregunta del banco.'
              : 'Escribe la pregunta a debatir.'
          );
          return false;
        }
        return true;

      case 5:
        if (!this.rolFiera()) {
          this.error.set('Selecciona el papel de FIERA en la liga.');
          return false;
        }
        return true;

      case 6:
        if (!this.fechaInicio()) {
          this.error.set('Indica la fecha de inicio de la liga.');
          return false;
        }
        if (!this.diaSemana()) {
          this.error.set('Selecciona el día de la semana.');
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
