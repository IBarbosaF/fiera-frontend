import {
  Component, inject, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DebateService } from '../../../core/services/debate.service';

/* ============================================================
   PartidaDebate — Pantalla del debate en vivo

   Gestiona:
   - Secuencia de sub-turnos leída desde SubTurnoConfig
   - Temporizador circular con countdown
   - Grabación de voz del usuario (MediaRecorder)
   - Reproducción del audio de FIERA (base64 → mp3)
   - Historial de intervenciones
   - Interrupciones (FIERA levanta la mano / Tú levantas la mano)
   - Navegación a resultados al finalizar, esperando a que la
     última petición pendiente al backend se resuelva primero
============================================================ */

export interface SubTurno {
  id            : string;
  intervencionId: number | null;
  nombre        : string;
  quien         : 'equipo' | 'fiera' | 'companero';
  duracion      : number;   /* en segundos */
  postura       : 'favor' | 'contra';
}

export interface ItemHistorial {
  titulo   : string;
  texto    : string;
  expandido: boolean;
  esAudio  : boolean;  /* true si fue una intervención de voz */
}

/* Circunferencia SVG (r=85): 2 * PI * 85 ≈ 534 */
const CIRCUNFERENCIA = 534;

/* Fallbacks simulados */
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

/* Tiempo máximo de espera por la última petición pendiente (ms) */
const TIMEOUT_ESPERA_FINAL = 12000;

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
  cdr           = inject(ChangeDetectorRef);

  /* ── Estado del debate ── */
  secuencia      : SubTurno[] = [];
  subTurnoActual = signal(0);
  segundosRest   = signal(0);
  pausado        = false;
  private intervalId          : ReturnType<typeof setInterval> | null = null;
  private timeoutInterrupcion : ReturnType<typeof setTimeout>  | null = null;

  /* ── Historial ── */
  historial = signal<ItemHistorial[]>([]);

  /* ── Estado grabación ── */
  grabando          = signal(false);
  procesandoAudio   = signal(false);  /* esperando respuesta del backend */
  errorMicrofono    = signal(false);
  fieraHablando     = signal(false);  /* FIERA reproduciendo audio */

  /* Marca si hay una petición a procesarTurno() en curso. Se usa
     para que finalizarDebate() no navegue hasta que se resuelva,
     evitando perder los resultados del último turno del usuario. */
  peticionPendiente = signal(false);
  finalizandoDebate = signal(false); /* muestra un loader al cerrar el debate */

  private mediaRecorder  : MediaRecorder | null = null;
  private audioChunks    : Blob[]        = [];
  private streamActual   : MediaStream   | null = null;
  private audioActual    : HTMLAudioElement | null = null;

  /* ── Modales ── */
  modalSalirAbierto         = signal(false);
  modalFieraLevantaAbierto  = signal(false);
  modalPreguntaFieraAbierto = signal(false);
  modalTuPreguntaAbierto    = signal(false);
  preguntaFieraTexto        = signal('');

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
    this.detenerGrabacion();
    this.detenerAudioFiera();
    if (this.streamActual) {
      this.streamActual.getTracks().forEach(t => t.stop());
    }
  }

  /* ----------------------------------------------------------
     construirSecuencia()
  ---------------------------------------------------------- */
  private construirSecuencia(): SubTurno[] {
    const subturnos      = this.debateService.cargarSubturnos();
    const debateActivo   = this.debateService.getDebateActivo();
    const intervenciones = debateActivo?.intervenciones ?? [];
    const activos        = subturnos.filter(t => t.activo);

    return activos.map((t, index): SubTurno => ({
      id            : t.id,
      intervencionId: intervenciones[index]?.id ?? null,
      nombre        : t.nombre,
      quien         : (t.asignado === 'yo' ? 'equipo' : t.asignado) as SubTurno['quien'],
      duracion      : t.segundos ?? t.minutos * 60,
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
      this.turnoFiera(sub);
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
        this.detenerGrabacion();
        setTimeout(() => this.iniciarSubTurno(this.subTurnoActual() + 1), 800);
      }
    }, 1000);
  }

  /* ----------------------------------------------------------
     turnoFiera()
     Llama al backend, recibe texto + audio base64 y lo reproduce
  ---------------------------------------------------------- */
  private turnoFiera(sub: SubTurno): void {
    const debateActivo = this.debateService.getDebateActivo();

    if (debateActivo && sub.intervencionId) {
      this.fieraHablando.set(true);
      this.peticionPendiente.set(true);
      this.cdr.markForCheck();

      this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, '').subscribe({
        next: (res) => {
          const texto  = res?.respuestaFiera?.mensaje ?? '';
          const audio  = res?.respuestaFiera?.audio;
          const titulo = `${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — FIERA`;

          this.añadirAlHistorial(titulo, texto || '(FIERA está argumentando...)', false);
          this.peticionPendiente.set(false);

          if (audio) {
            this.reproducirAudioFiera(audio).finally(() => {
              this.fieraHablando.set(false);
              this.cdr.markForCheck();
            });
          } else {
            this.fieraHablando.set(false);
            this.cdr.markForCheck();
          }
        },
        error: () => {
          const texto = RESPUESTAS_FIERA[Math.floor(Math.random() * RESPUESTAS_FIERA.length)];
          this.añadirAlHistorial(`${sub.nombre} — FIERA (simulado)`, texto, false);
          this.fieraHablando.set(false);
          this.peticionPendiente.set(false);
          this.cdr.markForCheck();
        }
      });
    } else {
      /* Sin conexión — fallback simulado */
      setTimeout(() => {
        const texto = RESPUESTAS_FIERA[Math.floor(Math.random() * RESPUESTAS_FIERA.length)];
        this.añadirAlHistorial(`${sub.nombre} — FIERA (simulado)`, texto, false);
        this.fieraHablando.set(false);
        this.cdr.markForCheck();
      }, 1500);
    }
  }

  /* ----------------------------------------------------------
     reproducirAudioFiera()
     Decodifica base64 → Blob mp3 → Audio.play()
  ---------------------------------------------------------- */
  private reproducirAudioFiera(base64: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url  = URL.createObjectURL(blob);

        this.detenerAudioFiera();
        this.audioActual = new Audio(url);

        this.audioActual.onended = () => {
          URL.revokeObjectURL(url);
          this.audioActual = null;
          resolve();
        };

        this.audioActual.onerror = () => {
          URL.revokeObjectURL(url);
          this.audioActual = null;
          resolve(); /* resuelve igualmente para no bloquear el flujo */
        };

        this.audioActual.play().catch(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  private detenerAudioFiera(): void {
    if (this.audioActual) {
      this.audioActual.pause();
      this.audioActual = null;
    }
  }

  /* ----------------------------------------------------------
     GRABACIÓN DE VOZ
  ---------------------------------------------------------- */

  /* Inicia la grabación al pulsar el botón de micrófono */
  async iniciarGrabacion(): Promise<void> {
    if (this.grabando()) return;

    try {
      this.errorMicrofono.set(false);
      this.streamActual = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.streamActual, { mimeType });
      this.audioChunks   = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.enviarAudioAlBackend(blob);
      };

      this.mediaRecorder.start();
      this.grabando.set(true);
      this.cdr.markForCheck();
    } catch {
      this.errorMicrofono.set(true);
      this.cdr.markForCheck();
    }
  }

  /* Detiene la grabación y dispara el envío */
  detenerGrabacion(): void {
    if (!this.grabando()) return;
    this.grabando.set(false);
    this.mediaRecorder?.stop();
    this.streamActual?.getTracks().forEach(t => t.stop());
    this.streamActual = null;
    this.cdr.markForCheck();
  }

  /* Envía el audio grabado al backend */
  private enviarAudioAlBackend(audio: Blob): void {
    const sub          = this.secuencia[this.subTurnoActual()];
    const debateActivo = this.debateService.getDebateActivo();

    this.procesandoAudio.set(true);
    this.peticionPendiente.set(true);
    this.cdr.markForCheck();

    this.añadirAlHistorial(
      `${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — Tú`,
      '🎙️ Intervención de voz enviada',
      true
    );

    if (debateActivo && sub.intervencionId) {
      this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, '', audio)
        .subscribe({
          next: (res) => {
            /* Si el backend devuelve la transcripción, actualizamos el historial */
            const transcripcion = res?.debateResponse?.intervenciones
              ?.find((i: any) => i.id === sub.intervencionId)?.mensaje;

            if (transcripcion) {
              this.historial.update(h => {
                const copia = [...h];
                const idx   = copia.findIndex(i => i.esAudio && i.titulo.includes('Tú'));
                if (idx >= 0) copia[idx] = { ...copia[idx], texto: transcripcion };
                return copia;
              });
            }

            this.procesandoAudio.set(false);
            this.peticionPendiente.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.procesandoAudio.set(false);
            this.peticionPendiente.set(false);
            this.cdr.markForCheck();
          }
        });
    } else {
      this.procesandoAudio.set(false);
      this.peticionPendiente.set(false);
      this.cdr.markForCheck();
    }
  }

  /* ----------------------------------------------------------
     accionPrincipal — botón principal según turno
  ---------------------------------------------------------- */
  accionPrincipal(texto: string, input: HTMLInputElement): void {
    const sub = this.secuencia[this.subTurnoActual()];
    if (sub.quien === 'equipo') {
      if (texto.trim()) {
        this.enviarTexto(texto, input);
      }
    } else {
      this.modalTuPreguntaAbierto.set(true);
    }
  }

  /* Envío de texto (fallback cuando no se usa micrófono) */
  private enviarTexto(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;

    const sub          = this.secuencia[this.subTurnoActual()];
    const debateActivo = this.debateService.getDebateActivo();

    this.añadirAlHistorial(
      `${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — Tú`,
      texto.trim(),
      false
    );
    input.value = '';

    if (debateActivo && sub.intervencionId) {
      this.peticionPendiente.set(true);
      this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, texto.trim())
        .subscribe({
          next : () => this.peticionPendiente.set(false),
          error: () => this.peticionPendiente.set(false)
        });
    }
  }

  /* ----------------------------------------------------------
     SVG timer
  ---------------------------------------------------------- */
  private actualizarSvg(): void {
    const sub = this.secuencia[this.subTurnoActual()];
    if (!sub) return;
    const progreso = this.segundosRest() / sub.duracion;
    this.svgOffset.set(CIRCUNFERENCIA * (1 - progreso));
  }

  /* ----------------------------------------------------------
     Interrupciones
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
      this.cdr.markForCheck();
    }, cuando);
  }

  rechazarPreguntaFiera(): void {
    const sub = this.secuencia[this.subTurnoActual()];
    this.añadirAlHistorial(`${sub.nombre} — FIERA`, '(Solicitud de pregunta rechazada)', false);
    this.modalFieraLevantaAbierto.set(false);
  }

  aceptarPreguntaFiera(): void {
    const pregunta = PREGUNTAS_FIERA[Math.floor(Math.random() * PREGUNTAS_FIERA.length)];
    const sub      = this.secuencia[this.subTurnoActual()];
    this.preguntaFieraTexto.set(pregunta);
    this.añadirAlHistorial(`${sub.nombre} — FIERA pregunta`, pregunta, false);
    this.modalFieraLevantaAbierto.set(false);
    this.modalPreguntaFieraAbierto.set(true);
  }

  enviarRespuestaAFiera(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;
    const sub = this.secuencia[this.subTurnoActual()];
    this.añadirAlHistorial(`${sub.nombre} — Tú (respuesta)`, texto.trim(), false);
    input.value = '';
    this.modalPreguntaFieraAbierto.set(false);
  }

  cancelarTuPregunta(): void {
    this.modalTuPreguntaAbierto.set(false);
  }

  enviarTuPregunta(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;
    const sub = this.secuencia[this.subTurnoActual()];
    this.añadirAlHistorial(`${sub.nombre} — Tú pregunta`, texto.trim(), false);
    setTimeout(() => {
      const respuesta = RESPUESTAS_A_PREGUNTA[Math.floor(Math.random() * RESPUESTAS_A_PREGUNTA.length)];
      this.añadirAlHistorial(`${sub.nombre} — FIERA responde`, respuesta, false);
      this.cdr.markForCheck();
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
    this.detenerGrabacion();
    this.detenerAudioFiera();
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
     Finalizar debate.
     Espera a que la última petición pendiente al backend se
     resuelva (con un timeout de seguridad) antes de navegar,
     para asegurarnos de que los resultados ya estén guardados
     en el servicio cuando lleguemos a /resultados.
  ---------------------------------------------------------- */
  private finalizarDebate(): void {
    this.limpiarTimers();
    this.detenerAudioFiera();
    this.finalizandoDebate.set(true);
    this.cdr.markForCheck();

    this.esperarPeticionPendiente().finally(() => {
      this.router.navigate(['/resultados']);
    });
  }

  /* Espera con polling a que peticionPendiente() sea false,
     con un timeout máximo para no bloquear indefinidamente
     si el backend no responde. */
  private esperarPeticionPendiente(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peticionPendiente()) {
        resolve();
        return;
      }

      const inicio = Date.now();
      const intervalo = setInterval(() => {
        const sinPendientes = !this.peticionPendiente();
        const tiempoAgotado = Date.now() - inicio >= TIMEOUT_ESPERA_FINAL;

        if (sinPendientes || tiempoAgotado) {
          clearInterval(intervalo);
          resolve();
        }
      }, 200);
    });
  }

  /* ----------------------------------------------------------
     Historial
  ---------------------------------------------------------- */
  añadirAlHistorial(titulo: string, texto: string, esAudio: boolean): void {
    this.historial.update(h => [{ titulo, texto, expandido: false, esAudio }, ...h]);
    this.cdr.markForCheck();
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
    if (this.intervalId)          clearInterval(this.intervalId);
    if (this.timeoutInterrupcion) clearTimeout(this.timeoutInterrupcion);
    this.intervalId          = null;
    this.timeoutInterrupcion = null;
  }
}
