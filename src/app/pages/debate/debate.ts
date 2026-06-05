import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink  } from '@angular/router';
import { DebateService } from '../../core/services/debate.service';

/* ============================================================
   DebateComponent — Pantalla del debate en vivo

   Gestiona:
   - Secuencia de sub-turnos (Tú / FIERA alternados)
   - Temporizador circular con countdown
   - Historial de intervenciones
   - Interrupciones (FIERA levanta la mano / Tú levantas la mano)
   - Navegación a resultados al finalizar

   TODO: conectar respuestas de FIERA con backend de IA
============================================================ */

/* Interfaz de un sub-turno del debate */
export interface SubTurno {
  id      : string;
  nombre  : string;
  quien   : 'equipo' | 'fiera';
  duracion: number; /* en segundos */
}

/* Interfaz de una intervención del historial */
export interface ItemHistorial {
  titulo: string;
  texto : string;
  expandido: boolean;
}

/* Nombres legibles de cada intervención */
const NOMBRES: Record<string, string> = {
  intro     : 'Introducción',
  ref1      : '1ª Refutación',
  ref2      : '2ª Refutación',
  conclusion: 'Conclusión',
};

const ORDEN = ['intro', 'ref1', 'ref2', 'conclusion'];

/* Respuestas simuladas de FIERA
   TODO: reemplazar con llamada a la API de IA del backend */
const RESPUESTAS_FIERA = [
  'La evidencia empírica no respalda esa afirmación de forma concluyente.',
  'Ese argumento incurre en una generalización excesiva que debilita la tesis.',
  'Desde un enfoque histórico, ese razonamiento ha demostrado ser ineficaz.',
  'Existen múltiples estudios que contradicen directamente esa premisa.',
  'La lógica de ese planteamiento contiene una falacia de falsa causalidad.',
  'Interesante perspectiva, pero omite factores estructurales determinantes.',
];

/* Preguntas que FIERA hace al interrumpir
   TODO: reemplazar con llamada a la API de IA del backend */
const PREGUNTAS_FIERA = [
  '¿Puede concretar con datos reales ese argumento que acaba de exponer?',
  '¿No contradice eso lo que afirmó en su introducción?',
  '¿Cómo respondería a los estudios que refutan directamente esa tesis?',
  '¿Está asumiendo una correlación sin demostrar causalidad?',
  '¿Qué evidencia empírica respalda específicamente ese punto?',
];

/* Respuestas de FIERA cuando el usuario le pregunta
   TODO: reemplazar con llamada a la API de IA del backend */
const RESPUESTAS_A_PREGUNTA = [
  'Es una pregunta interesante, pero no altera el núcleo de mi argumento.',
  'Precisamente esa cuestión refuerza mi posición si analizamos los datos.',
  'La respuesta es compleja, pero en síntesis: los hechos me dan la razón.',
  'Agradezco la pregunta. Mi postura se sostiene incluso bajo ese supuesto.',
];

/* Circunferencia SVG (r=85): 2 * PI * 85 ≈ 534 */
const CIRCUNFERENCIA = 534;

@Component({
  selector        : 'app-debate',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './debate.html',
  styleUrl        : './debate.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Debate implements OnInit, OnDestroy {

  debateService = inject(DebateService);
  router        = inject(Router);

  /* ── Estado del debate ── */
  secuencia      : SubTurno[] = [];
  subTurnoActual = signal(0);
  segundosRest   = signal(0);
  pausado        = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeoutInterrupcion: ReturnType<typeof setTimeout> | null = null;

  /* ── Historial ── */
  historial = signal<ItemHistorial[]>([]);

  /* ── Modales ── */
  modalSalirAbierto         = signal(false);
  modalFieraLevantaAbierto  = signal(false);
  modalPreguntaFieraAbierto = signal(false);
  modalTuPreguntaAbierto    = signal(false);

  /* ── Texto de la pregunta de FIERA ── */
  preguntaFieraTexto = signal('');

  /* ── SVG timer ── */
  svgOffset = signal(0);
  timerUrgente = signal(false);

  /* ----------------------------------------------------------
     ngOnInit — Cargar config e iniciar el debate
  ---------------------------------------------------------- */
  ngOnInit(): void {
    this.debateService.cargarConfig();
    this.secuencia = this.construirSecuencia();
    this.iniciarSubTurno(0);
  }

  /* ----------------------------------------------------------
     ngOnDestroy — Limpiar timers al salir del componente
  ---------------------------------------------------------- */
  ngOnDestroy(): void {
    this.limpiarTimers();
  }

  /* ----------------------------------------------------------
     construirSecuencia()
     Genera el array de sub-turnos a partir de la config.
     Cada intervención se divide en dos sub-turnos:
     primero quien eligió el usuario, luego el contrario.
     TODO: validar con backend que la config es correcta
  ---------------------------------------------------------- */
  private construirSecuencia(): SubTurno[] {
    const config   = this.debateService.config();
    const secuencia: SubTurno[] = [];

    ORDEN.forEach(id => {
      const nombre   = NOMBRES[id];
      const duracion = (config.tiempos[id as keyof typeof config.tiempos] || 3) * 60;
      const primero  = config.turnos[id as keyof typeof config.turnos] || 'equipo';
      const segundo  = primero === 'equipo' ? 'fiera' : 'equipo';

      secuencia.push({ id, nombre, quien: primero, duracion });
      secuencia.push({ id, nombre, quien: segundo,  duracion });
    });

    return secuencia;
  }

  /* ----------------------------------------------------------
     iniciarSubTurno(indice)
     Configura el estado para el sub-turno dado y arranca
     el countdown
  ---------------------------------------------------------- */
  iniciarSubTurno(indice: number): void {
    if (indice >= this.secuencia.length) {
      this.finalizarDebate();
      return;
    }

    this.subTurnoActual.set(indice);
    const sub = this.secuencia[indice];
    this.segundosRest.set(sub.duracion);
    this.timerUrgente.set(false);
    this.actualizarSvg();

    /* Si es turno de FIERA: responde automáticamente y
       programa posible interrupción en refutaciones */
    if (sub.quien === 'fiera') {
      setTimeout(() => {
        const texto = RESPUESTAS_FIERA[Math.floor(Math.random() * RESPUESTAS_FIERA.length)];
        this.añadirAlHistorial(`${sub.nombre} — FIERA`, texto);
      }, 2000);
    } else {
      /* Es turno del usuario — programar interrupción en refutaciones */
      this.programarInterrupcionFiera(sub);
    }

    /* Arrancar countdown */
    this.limpiarTimers();
    this.intervalId = setInterval(() => {
      if (this.pausado) return;

      const restantes = this.segundosRest() - 1;
      this.segundosRest.set(restantes);
      this.timerUrgente.set(restantes <= 30);
      this.actualizarSvg();

      if (restantes <= 0) {
        this.limpiarTimers();
        setTimeout(() => this.iniciarSubTurno(this.subTurnoActual() + 1), 800);
      }
    }, 1000);
  }

  /* ----------------------------------------------------------
     actualizarSvg()
     Recalcula el offset del círculo SVG según los segundos
     restantes del sub-turno actual
  ---------------------------------------------------------- */
  private actualizarSvg(): void {
    const sub      = this.secuencia[this.subTurnoActual()];
    if (!sub) return;
    const progreso = this.segundosRest() / sub.duracion;
    this.svgOffset.set(CIRCUNFERENCIA * (1 - progreso));
  }

  /* ----------------------------------------------------------
     programarInterrupcionFiera(sub)
     En refutaciones durante el turno del usuario,
     FIERA interrumpe en un momento aleatorio.
     TODO: la lógica de interrupción vendrá del backend
  ---------------------------------------------------------- */
  private programarInterrupcionFiera(sub: SubTurno): void {
    if (sub.id !== 'ref1' && sub.id !== 'ref2') return;

    const minSeg = 15;
    const maxSeg = Math.max(minSeg + 5, sub.duracion - 15);
    const cuando = (Math.floor(Math.random() * (maxSeg - minSeg)) + minSeg) * 1000;

    this.timeoutInterrupcion = setTimeout(() => {
      if (this.secuencia[this.subTurnoActual()] !== sub) return;
      this.modalFieraLevantaAbierto.set(true);
    }, cuando);
  }

  /* ----------------------------------------------------------
     enviarArgumento(texto)
     Añade el argumento del usuario al historial.
     NO cambia de turno — el turno avanza al acabar el tiempo.
     TODO: enviar argumento al backend para análisis
  ---------------------------------------------------------- */
  enviarArgumento(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;
    const sub = this.secuencia[this.subTurnoActual()];
    this.añadirAlHistorial(`${sub.nombre} — Tú`, texto.trim());
    input.value = '';
  }

  /* ----------------------------------------------------------
     accionPrincipal(input)
     Gestiona el botón ENVIAR / LEVANTAR MANO según el turno
  ---------------------------------------------------------- */
  accionPrincipal(texto: string, input: HTMLInputElement): void {
    const sub = this.secuencia[this.subTurnoActual()];

    if (sub.quien === 'equipo') {
      this.enviarArgumento(texto, input);
    } else {
      /* LEVANTAR MANO durante turno de FIERA en refutaciones */
      if (sub.id === 'ref1' || sub.id === 'ref2') {
        this.modalTuPreguntaAbierto.set(true);
      }
    }
  }

  /* ----------------------------------------------------------
     Gestión modal: FIERA levanta la mano
  ---------------------------------------------------------- */
  rechazarPreguntaFiera(): void {
    const sub = this.secuencia[this.subTurnoActual()];
    this.añadirAlHistorial(`${sub.nombre} — FIERA`, '(Solicitud de pregunta rechazada)');
    this.modalFieraLevantaAbierto.set(false);
  }

  aceptarPreguntaFiera(): void {
    const pregunta = PREGUNTAS_FIERA[Math.floor(Math.random() * PREGUNTAS_FIERA.length)];
    const sub      = this.secuencia[this.subTurnoActual()];
    this.preguntaFieraTexto.set(pregunta);
    this.añadirAlHistorial(`${sub.nombre} — FIERA pregunta`, pregunta);
    this.modalFieraLevantaAbierto.set(false);
    this.modalPreguntaFieraAbierto.set(true);
  }

  enviarRespuestaAFiera(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;
    const sub = this.secuencia[this.subTurnoActual()];
    this.añadirAlHistorial(`${sub.nombre} — Tú (respuesta)`, texto.trim());
    input.value = '';
    this.modalPreguntaFieraAbierto.set(false);
  }

  /* ----------------------------------------------------------
     Gestión modal: Tú levantas la mano
  ---------------------------------------------------------- */
  cancelarTuPregunta(): void {
    this.modalTuPreguntaAbierto.set(false);
  }

  enviarTuPregunta(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;
    const sub = this.secuencia[this.subTurnoActual()];
    this.añadirAlHistorial(`${sub.nombre} — Tú pregunta`, texto.trim());

    setTimeout(() => {
      const respuesta = RESPUESTAS_A_PREGUNTA[Math.floor(Math.random() * RESPUESTAS_A_PREGUNTA.length)];
      this.añadirAlHistorial(`${sub.nombre} — FIERA responde`, respuesta);
    }, 1500);

    input.value = '';
    this.modalTuPreguntaAbierto.set(false);
  }

  /* ----------------------------------------------------------
     Gestión modal: Salir
  ---------------------------------------------------------- */
  abrirModalSalir(): void {
    this.pausado = true;
    this.limpiarTimers();
    this.modalSalirAbierto.set(true);
  }

  cancelarSalir(): void {
    this.modalSalirAbierto.set(false);
    this.pausado = false;
    /* Reanudar countdown */
    this.intervalId = setInterval(() => {
      if (this.pausado) return;
      const restantes = this.segundosRest() - 1;
      this.segundosRest.set(restantes);
      this.timerUrgente.set(restantes <= 30);
      this.actualizarSvg();
      if (restantes <= 0) {
        this.limpiarTimers();
        setTimeout(() => this.iniciarSubTurno(this.subTurnoActual() + 1), 800);
      }
    }, 1000);
  }

  confirmarSalir(): void {
    this.limpiarTimers();
    this.router.navigate(['/']);
  }

  /* ----------------------------------------------------------
     finalizarDebate()
     Genera puntuaciones simuladas y navega a resultados
     TODO: obtener puntuaciones reales del backend
  ---------------------------------------------------------- */
  private finalizarDebate(): void {
    this.limpiarTimers();

    const resultados = {
      argumentacion: Math.floor(Math.random() * 8) + 17,
      claridad     : Math.floor(Math.random() * 8) + 16,
      refutacion   : Math.floor(Math.random() * 8) + 16,
      evidencia    : Math.floor(Math.random() * 8) + 15,
    };

    this.debateService.guardarResultados(resultados);
    setTimeout(() => this.router.navigate(['/resultados']), 800);
  }

  /* ----------------------------------------------------------
     añadirAlHistorial(titulo, texto)
     Inserta una nueva intervención al historial
  ---------------------------------------------------------- */
  añadirAlHistorial(titulo: string, texto: string): void {
    this.historial.update(h => [
      { titulo, texto, expandido: false },
      ...h
    ]);
  }

  toggleHistorial(index: number): void {
    this.historial.update(h =>
      h.map((item, i) =>
        i === index ? { ...item, expandido: !item.expandido } : item
      )
    );
  }

  /* ----------------------------------------------------------
     Getters para el template
  ---------------------------------------------------------- */
  get subTurnoInfo(): SubTurno | null {
    return this.secuencia[this.subTurnoActual()] || null;
  }

  get esTuTurno(): boolean {
    return this.subTurnoInfo?.quien === 'equipo';
  }

  get esRefutacion(): boolean {
    const id = this.subTurnoInfo?.id;
    return id === 'ref1' || id === 'ref2';
  }

  formatearSegundos(seg: number): string {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get duracionTotal(): string {
    return this.subTurnoInfo
      ? this.formatearSegundos(this.subTurnoInfo.duracion)
      : '00:00';
  }

  /* ----------------------------------------------------------
     limpiarTimers()
     Cancela el interval y el timeout de interrupción
  ---------------------------------------------------------- */
  private limpiarTimers(): void {
    if (this.intervalId)          clearInterval(this.intervalId);
    if (this.timeoutInterrupcion) clearTimeout(this.timeoutInterrupcion);
    this.intervalId          = null;
    this.timeoutInterrupcion = null;
  }
}
