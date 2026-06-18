import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DebateService } from '../../../core/services/debate.service';

/* ============================================================
   PartidaDebate — Pantalla del debate en vivo

   Gestiona:
   - Secuencia de sub-turnos leída desde SubTurnoConfig
   - Temporizador circular con countdown
   - Historial de intervenciones
   - Interrupciones (FIERA levanta la mano / Tú levantas la mano)
   - Llamadas al backend via DebateService.procesarTurno()
   - Navegación a resultados al finalizar
============================================================ */

/* Sub-turno en ejecución durante la partida */
export interface SubTurno {
  id            : string;   /* id del SubTurnoConfig original */
  intervencionId: number | null; /* id de la intervención en el backend */
  nombre        : string;
  quien         : 'equipo' | 'fiera' | 'companero';
  duracion      : number;   /* en segundos */
  postura       : 'favor' | 'contra';
}

export interface ItemHistorial {
  titulo  : string;
  texto   : string;
  expandido: boolean;
}

/* Circunferencia SVG (r=85): 2 * PI * 85 ≈ 534 */
const CIRCUNFERENCIA = 534;

/* Fallbacks simulados — se usan si el backend no responde */
const RESPUESTAS_FIERA = [
  'La evidencia empírica no respalda esa afirmación de forma concluyente.',
  'Ese argumento incurre en una generalización excesiva que debilita la tesis.',
  'Desde un enfoque histórico, ese razonamiento ha demostrado ser ineficaz.',
  'Existen múltiples estudios que contradicen directamente esa premisa.',
  'La lógica de ese planteamiento contiene una falacia de falsa causalidad.',
  'Interesante perspectiva, pero omite factores estructurales determinantes.',
];

const PREGUNTAS_FIERA = [
  '¿Puede concretar con datos reales ese argumento que acaba de exponer?',
  '¿No contradice eso lo que afirmó en su introducción?',
  '¿Cómo respondería a los estudios que refutan directamente esa tesis?',
  '¿Está asumiendo una correlación sin demostrar causalidad?',
];

const RESPUESTAS_A_PREGUNTA = [
  'Es una pregunta interesante, pero no altera el núcleo de mi argumento.',
  'Precisamente esa cuestión refuerza mi posición si analizamos los datos.',
  'La respuesta es compleja, pero en síntesis: los hechos me dan la razón.',
  'Agradezco la pregunta. Mi postura se sostiene incluso bajo ese supuesto.',
];

@Component({
  selector        : 'app-partida-debate',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './partida-debate.html',
  styleUrl        : './partida-debate.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class PartidaDebate implements OnInit, OnDestroy {

  debateService = inject(DebateService);
  router        = inject(Router);

  /* ── Estado del debate ── */
  secuencia      : SubTurno[] = [];
  subTurnoActual = signal(0);
  segundosRest   = signal(0);
  pausado        = false;
  private intervalId           : ReturnType<typeof setInterval>  | null = null;
  private timeoutInterrupcion  : ReturnType<typeof setTimeout>   | null = null;

  /* ── Historial ── */
  historial = signal<ItemHistorial[]>([]);

  /* ── Modales ── */
  modalSalirAbierto         = signal(false);
  modalFieraLevantaAbierto  = signal(false);
  modalPreguntaFieraAbierto = signal(false);
  modalTuPreguntaAbierto    = signal(false);

  preguntaFieraTexto = signal('');

  /* ── SVG timer ── */
  svgOffset    = signal(0);
  timerUrgente = signal(false);

  /* ----------------------------------------------------------
     ngOnInit
  ---------------------------------------------------------- */
  ngOnInit(): void {
    this.debateService.cargarConfig();
    this.secuencia = this.construirSecuencia();
    this.iniciarSubTurno(0);
  }

  ngOnDestroy(): void {
    this.limpiarTimers();
  }

  /* ----------------------------------------------------------
     construirSecuencia()
     Lee los SubTurnoConfig guardados por el wizard y los
     convierte a SubTurno para la partida. Solo incluye
     los que están activos.
     Cruza con las intervenciones del DebateActivo para
     obtener el id real de cada intervención del backend.
  ---------------------------------------------------------- */
  private construirSecuencia(): SubTurno[] {
    const subturnos      = this.debateService.cargarSubturnos();
    const debateActivo   = this.debateService.getDebateActivo();
    const intervenciones = debateActivo?.intervenciones ?? [];

    const activos = subturnos.filter(t => t.activo);

    return activos.map((t, index): SubTurno => ({
      id            : t.id,
      intervencionId: intervenciones[index]?.id ?? null,
      nombre        : t.nombre,
      quien         : (t.asignado === 'yo' ? 'equipo' : t.asignado) as SubTurno['quien'],
      duracion      : t.minutos * 60,
      postura       : t.postura
    }));
  }

  /* ----------------------------------------------------------
     iniciarSubTurno(indice)
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

    if (sub.quien === 'fiera') {
      this.turnoFiera(sub, indice);
    } else {
      this.programarInterrupcionFiera(sub);
    }

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
     turnoFiera(sub, indice)
     Llama al backend para obtener la respuesta de FIERA.
     Usa fallback simulado si no hay conexión.
  ---------------------------------------------------------- */
  private turnoFiera(sub: SubTurno, indice: number): void {
    const debateActivo = this.debateService.getDebateActivo();

    console.log('🦁 TURNO FIERA:', {
      subTurno      : sub,
      indice,
      debateId      : debateActivo?.id,
      intervencionId: sub.intervencionId
    })

    if (debateActivo && sub.intervencionId) {
      this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, '').subscribe({
        next: (res) => {
          console.log('🦁 RESPUESTA FIERA:', res)
          const texto = res?.respuestaFiera?.mensaje
            ?? RESPUESTAS_FIERA[Math.floor(Math.random() * RESPUESTAS_FIERA.length)];
          this.añadirAlHistorial(`${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — FIERA`, texto);
        },
        error: (err) => {
          console.error('🦁 ERROR TURNO FIERA:', err);
          const texto = RESPUESTAS_FIERA[Math.floor(Math.random() * RESPUESTAS_FIERA.length)];
          this.añadirAlHistorial(`${sub.nombre} — FIERA (simulado)`, texto);
        }
      });
    } else {
      console.warn('🦁 Sin debateActivo o intervencionId — usando fallback', {
        debateActivo,
        intervencionId: sub.intervencionId
      });
      setTimeout(() => {
        const texto = RESPUESTAS_FIERA[Math.floor(Math.random() * RESPUESTAS_FIERA.length)];
        this.añadirAlHistorial(`${sub.nombre} — FIERA (simulado)`, texto);
      }, 1500);
    }
  }

  /* ----------------------------------------------------------
     enviarArgumento(texto, input)
  ---------------------------------------------------------- */
  enviarArgumento(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;

    const sub          = this.secuencia[this.subTurnoActual()];
    const debateActivo = this.debateService.getDebateActivo();

    console.log('👤 TURNO USUARIO:', {
      subTurno      : sub,
      texto         : texto.trim(),
      debateId      : debateActivo?.id,
      intervencionId: sub.intervencionId
    });

    this.añadirAlHistorial(
      `${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — Tú`,
      texto.trim()
    );
    input.value = '';

    if (debateActivo && sub.intervencionId) {
      this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, texto.trim())
        .subscribe({
          next : (res) => console.log('Argumento registrado:', res),
          error: (err) => console.warn('No se pudo registrar el argumento:', err)
        });
    }
  }

  /* ----------------------------------------------------------
     actualizarSvg()
  ---------------------------------------------------------- */
  private actualizarSvg(): void {
    const sub = this.secuencia[this.subTurnoActual()];
    if (!sub) return;
    const progreso = this.segundosRest() / sub.duracion;
    this.svgOffset.set(CIRCUNFERENCIA * (1 - progreso));
  }

  /* ----------------------------------------------------------
     programarInterrupcionFiera(sub)
  ---------------------------------------------------------- */
  private programarInterrupcionFiera(sub: SubTurno): void {
    const esRefutacion = sub.id.startsWith('ref');
    if (!esRefutacion) return;

    const minSeg = 15;
    const maxSeg = Math.max(minSeg + 5, sub.duracion - 15);
    const cuando = (Math.floor(Math.random() * (maxSeg - minSeg)) + minSeg) * 1000;

    this.timeoutInterrupcion = setTimeout(() => {
      if (this.secuencia[this.subTurnoActual()] !== sub) return;
      this.modalFieraLevantaAbierto.set(true);
    }, cuando);
  }

  /* ----------------------------------------------------------
     accionPrincipal
  ---------------------------------------------------------- */
  accionPrincipal(texto: string, input: HTMLInputElement): void {
    const sub = this.secuencia[this.subTurnoActual()];
    if (sub.quien === 'equipo') {
      this.enviarArgumento(texto, input);
    } else if (sub.id.startsWith('ref')) {
      this.modalTuPreguntaAbierto.set(true);
    }
  }

  /* ----------------------------------------------------------
     Modales FIERA levanta la mano
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
     Modales Tú levantas la mano
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
     Modal Salir
  ---------------------------------------------------------- */
  abrirModalSalir(): void {
    this.pausado = true;
    this.limpiarTimers();
    this.modalSalirAbierto.set(true);
  }

  cancelarSalir(): void {
    this.modalSalirAbierto.set(false);
    this.pausado = false;
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
     Historial
  ---------------------------------------------------------- */
  añadirAlHistorial(titulo: string, texto: string): void {
    this.historial.update(h => [{ titulo, texto, expandido: false }, ...h]);
  }

  toggleHistorial(index: number): void {
    this.historial.update(h =>
      h.map((item, i) => i === index ? { ...item, expandido: !item.expandido } : item)
    );
  }

  /* ----------------------------------------------------------
     Getters para el template
  ---------------------------------------------------------- */
  get subTurnoInfo(): SubTurno | null {
    return this.secuencia[this.subTurnoActual()] ?? null;
  }

  get esTuTurno(): boolean {
    return this.subTurnoInfo?.quien === 'equipo';
  }

  get esRefutacion(): boolean {
    return this.subTurnoInfo?.id.startsWith('ref') ?? false;
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

  private limpiarTimers(): void {
    if (this.intervalId)         clearInterval(this.intervalId);
    if (this.timeoutInterrupcion) clearTimeout(this.timeoutInterrupcion);
    this.intervalId          = null;
    this.timeoutInterrupcion = null;
  }
}
