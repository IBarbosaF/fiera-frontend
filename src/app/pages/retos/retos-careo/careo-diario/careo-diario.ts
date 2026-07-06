import {
  Component, inject, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { DebateService, SubTurnoConfig, ResultadoApi } from '../../../../core/services/debate.service';

/* ============================================================
   CareoDiario — Reto: Careo 1vs1 contra FIERA

   A diferencia del Careo del wizard (crear-debate → partida-debate),
   aquí no hay configuración manual: tema y postura se eligen al
   azar, y el bucle de turnos vive en esta misma pantalla, más
   ligera que partida-debate (sin timer circular ni interrupciones).

   Reutiliza el mismo DebateService y la misma estructura de
   4 turnos (Exposición favor/contra, Réplica favor/contra) que
   ya usa el modo "careo" del wizard.

   Bloqueo diario: una vez finalizado, se guarda en localStorage
   con la fecha de hoy y la pantalla pasa a modo "ya completado".
============================================================ */

const STORAGE_COMPLETADO = 'careo_reto_completado';


const PERSONALIDADES = ['agresiva', 'elegante', 'sarcastica'] as const;

const TURNOS_CAREO_RETO = [
  { id: 'exp-f', nombre: 'Exposición inicial', postura: 'favor'  as const },
  { id: 'exp-c', nombre: 'Exposición inicial', postura: 'contra' as const },
  { id: 'rep-f', nombre: 'Réplica',            postura: 'favor'  as const },
  { id: 'rep-c', nombre: 'Réplica',            postura: 'contra' as const },
];

interface SubTurnoCareo {
  id            : string;
  intervencionId: number | null;
  nombre        : string;
  quien         : 'equipo' | 'fiera';
  duracion      : number;
  postura       : 'favor' | 'contra';
}

interface ItemHistorial {
  titulo : string;
  texto  : string;
  esAudio: boolean;
}

interface CareoCompletado {
  fecha    : string;
  resultado: ResultadoApi | null;
}

@Component({
  selector        : 'app-careo-diario',
  standalone      : true,
  imports         : [],
  templateUrl     : './careo-diario.html',
  styleUrl        : './careo-diario.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class CareoDiario implements OnInit, OnDestroy {

  private debateService = inject(DebateService);
  private router        = inject(Router);
  private cdr            = inject(ChangeDetectorRef);

  /* ── Estado "preparado" — antes de arrancar los turnos ── */
  preparado = signal<{
    tema        : string;
    categoria   : string;
    postura     : 'favor' | 'contra';
    personalidad: string;
    duracionTurno: number;
  } | null>(null);

  /** true solo cuando el usuario ya pulsó "Comenzar" */
  empezado = signal(false);

  /* ── Estado de carga inicial (creando el careo) ── */
  cargando   = signal(true);
  errorCarga = signal(false);

  /* ── Bloqueo diario ── */
  completadoHoy = signal<CareoCompletado | null>(this.cargarCompletadoHoy());

  /* ── Turnos ── */
  secuencia: SubTurnoCareo[] = [];
  turnoActual  = signal(0);
  segundosRest = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  historial = signal<ItemHistorial[]>([]);

  /* ── Grabación / estado de red ── */
  grabando          = signal(false);
  procesando        = signal(false);
  errorMicrofono    = signal(false);
  fieraHablando     = signal(false);
  peticionPendiente = signal(false);
  finalizando       = signal(false);

  private mediaRecorder: MediaRecorder    | null = null;
  private audioChunks  : Blob[]           = [];
  private streamActual : MediaStream      | null = null;
  private audioActual  : HTMLAudioElement | null = null;

  /* ── Resultado final ── */
  resultadoFinal = signal<ResultadoApi | null>(null);

  /* ──────────────────────────────────────────────────────────
     CICLO DE VIDA
  ────────────────────────────────────────────────────────── */
  ngOnInit(): void {
    if (this.completadoHoy()) {
      this.cargando.set(false);
      return;
    }
    this.iniciarCareo();
  }

  ngOnDestroy(): void {
    this.limpiarTimer();
    this.detenerGrabacion();
    this.detenerAudioFiera();
    this.streamActual?.getTracks().forEach(t => t.stop());
  }

  textoPersonalidad(p: string): string {
    const map: Record<string, string> = {
      agresiva  : 'Agresiva',
      elegante  : 'Elegante',
      sarcastica: 'Sarcástica',
    };
    return map[p] ?? p;
  }

  /** El usuario pulsa "Comenzar Careo" en la pantalla de preparación */
  comenzarCareo(): void {
    this.preparado.set(null);
    this.empezado.set(true);
    this.cdr.markForCheck();
    this.iniciarTurno(0);
  }

  /* ──────────────────────────────────────────────────────────
     CREACIÓN AUTOMÁTICA DEL CAREO
     Mismo flujo que CrearDebate.iniciarDebate(), pero con tema
     y postura elegidos al azar en vez de vía wizard.
  ────────────────────────────────────────────────────────── */
  private iniciarCareo(): void {
    this.debateService.getTemas().subscribe({
      next: temas => {
        if (!temas.length) {
          this.errorCarga.set(true);
          this.cargando.set(false);
          return;
        }

        // Tema y duración: mismos para todos hoy, cambian mañana
        const tema           = this.debateService.getTemaDelDia(temas);
        const tiempoPorTurno = this.debateService.getTiempoPorTurnoDelDia();

        if (!tema) {
          this.errorCarga.set(true);
          this.cargando.set(false);
          return;
        }


        // Postura: individual, aleatoria en cada intento
        const postura: 'favor' | 'contra' = Math.random() > 0.5 ? 'favor' : 'contra';
        const personalidad = PERSONALIDADES[Math.floor(Math.random() * PERSONALIDADES.length)];

        this.debateService.actualizarConfig({
          modo        : 'express',
          dificultad  : 'medio',
          postura,
          tema        : { id: tema.id, enunciado: tema.enunciado, categoria: tema.categoria },
          personalidad,
        });

        const subturnos: SubTurnoConfig[] = TURNOS_CAREO_RETO.map(t => ({
          id      : t.id,
          nombre  : t.nombre,
          postura : t.postura,
          minutos : tiempoPorTurno / 60,
          segundos: tiempoPorTurno,
          activo  : true,
          asignado: t.postura === 'favor'
            ? (postura === 'contra' ? 'fiera' : 'yo')
            : (postura === 'contra' ? 'yo'    : 'fiera'),
        }));

        this.debateService.guardarSubturnos(subturnos);

        this.debateService.getFieras().subscribe(() => {
        this.debateService.crearDebate().subscribe({
          next: debate => {
            if (debate?.id) {
              this.debateService.setDebateId(debate.id);
              this.debateService.setDebateActivo(debate);
            }
            this.secuencia = this.construirSecuencia(subturnos);

            // En vez de arrancar directo, mostramos la pantalla de "preparado"
            this.preparado.set({
              tema         : tema.enunciado,
              categoria    : tema.categoria,
              postura,
              personalidad,
              duracionTurno: tiempoPorTurno,
            });

            this.cargando.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.errorCarga.set(true);
            this.cargando.set(false);
            this.cdr.markForCheck();
          }
        });
        });
      },
      error: () => {
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
    });
  }

  private construirSecuencia(subturnos: SubTurnoConfig[]): SubTurnoCareo[] {
    const debateActivo   = this.debateService.getDebateActivo();
    const intervenciones = debateActivo?.intervenciones ?? [];

    return subturnos.map((t, i): SubTurnoCareo => ({
      id            : t.id,
      intervencionId: intervenciones[i]?.id ?? null,
      nombre        : t.nombre,
      quien         : t.asignado === 'yo' ? 'equipo' : 'fiera',
      duracion      : t.segundos ?? t.minutos * 60,
      postura       : t.postura,
    }));
  }

  /* ──────────────────────────────────────────────────────────
     BUCLE DE TURNOS
  ────────────────────────────────────────────────────────── */
  iniciarTurno(indice: number): void {
    if (indice >= this.secuencia.length) {
      this.finalizarCareo();
      return;
    }

    this.turnoActual.set(indice);
    const sub = this.secuencia[indice];
    this.segundosRest.set(sub.duracion);

    if (sub.quien === 'fiera') {
      this.turnoFiera(sub);
    }

    this.limpiarTimer();
    this.intervalId = setInterval(() => {
      const restantes = this.segundosRest() - 1;
      this.segundosRest.set(restantes);
      if (restantes <= 0) {
        this.limpiarTimer();
        this.detenerGrabacion();
        setTimeout(() => this.iniciarTurno(this.turnoActual() + 1), 600);
      }
    }, 1000);
  }

  private turnoFiera(sub: SubTurnoCareo): void {
    const debateActivo = this.debateService.getDebateActivo();

    if (!debateActivo || !sub.intervencionId) {
      setTimeout(() => this.iniciarTurno(this.turnoActual() + 1), 1200);
      return;
    }

    this.fieraHablando.set(true);
    this.peticionPendiente.set(true);
    this.cdr.markForCheck();

    this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, '').subscribe({
      next: res => {
        const texto = res?.respuestaFiera?.mensaje ?? '(FIERA está argumentando...)';
        const audio = res?.respuestaFiera?.audio;

        this.anadirHistorial(
          `${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — FIERA`,
          texto, false
        );
        this.peticionPendiente.set(false);

        if (audio) {
          this.reproducirAudio(audio).finally(() => {
            this.fieraHablando.set(false);
            this.cdr.markForCheck();
          });
        } else {
          this.fieraHablando.set(false);
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.anadirHistorial(`${sub.nombre} — FIERA`, 'No se ha podido obtener la respuesta.', false);
        this.fieraHablando.set(false);
        this.peticionPendiente.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private reproducirAudio(base64: string): Promise<void> {
    return new Promise(resolve => {
      try {
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url  = URL.createObjectURL(blob);

        this.detenerAudioFiera();
        this.audioActual = new Audio(url);
        this.audioActual.onended = () => { URL.revokeObjectURL(url); this.audioActual = null; resolve(); };
        this.audioActual.onerror = () => { URL.revokeObjectURL(url); this.audioActual = null; resolve(); };
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

  /* ──────────────────────────────────────────────────────────
     TURNO DEL USUARIO — texto
  ────────────────────────────────────────────────────────── */
  enviarTexto(texto: string, input: HTMLInputElement): void {
    if (!texto.trim()) return;

    const sub          = this.secuencia[this.turnoActual()];
    const debateActivo = this.debateService.getDebateActivo();

    this.anadirHistorial(
      `${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — Tú`,
      texto.trim(), false
    );
    input.value = '';

    if (debateActivo && sub.intervencionId) {
      this.peticionPendiente.set(true);
      this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, texto.trim()).subscribe({
        next : () => this.peticionPendiente.set(false),
        error: () => this.peticionPendiente.set(false)
      });
    }
  }

  /* ──────────────────────────────────────────────────────────
     TURNO DEL USUARIO — voz
  ────────────────────────────────────────────────────────── */
  async iniciarGrabacion(): Promise<void> {
    if (this.grabando()) return;
    try {
      this.errorMicrofono.set(false);
      this.streamActual = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.streamActual, { mimeType });
      this.audioChunks   = [];

      this.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.enviarAudio(blob);
      };

      this.mediaRecorder.start();
      this.grabando.set(true);
      this.cdr.markForCheck();
    } catch {
      this.errorMicrofono.set(true);
      this.cdr.markForCheck();
    }
  }

  detenerGrabacion(): void {
    if (!this.grabando()) return;
    this.grabando.set(false);
    this.mediaRecorder?.stop();
    this.streamActual?.getTracks().forEach(t => t.stop());
    this.streamActual = null;
    this.cdr.markForCheck();
  }

  private enviarAudio(audio: Blob): void {
    const sub          = this.secuencia[this.turnoActual()];
    const debateActivo = this.debateService.getDebateActivo();

    this.procesando.set(true);
    this.peticionPendiente.set(true);
    this.cdr.markForCheck();

    this.anadirHistorial(
      `${sub.nombre} (${sub.postura === 'favor' ? 'A favor' : 'En contra'}) — Tú`,
      '🎙️ Intervención de voz enviada', true
    );

    if (debateActivo && sub.intervencionId) {
      this.debateService.procesarTurno(debateActivo.id, sub.intervencionId, '', audio).subscribe({
        next: res => {
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

          this.procesando.set(false);
          this.peticionPendiente.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.procesando.set(false);
          this.peticionPendiente.set(false);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.procesando.set(false);
      this.peticionPendiente.set(false);
      this.cdr.markForCheck();
    }
  }

  private anadirHistorial(titulo: string, texto: string, esAudio: boolean): void {
    this.historial.update(h => [...h, { titulo, texto, esAudio }]);
    this.cdr.markForCheck();
  }

  /* ──────────────────────────────────────────────────────────
     FINALIZAR
  ────────────────────────────────────────────────────────── */
  private finalizarCareo(): void {
    this.limpiarTimer();
    this.detenerAudioFiera();
    this.finalizando.set(true);
    this.cdr.markForCheck();

    this.esperarPendiente().finally(() => {
      const resultado = this.debateService.obtenerResultadoUsuario(4); // TODO: id real del usuario logueado
      this.resultadoFinal.set(resultado);
      this.guardarCompletadoHoy(resultado);
      this.finalizando.set(false);
      this.cdr.markForCheck();
    });
  }

  private esperarPendiente(): Promise<void> {
    return new Promise(resolve => {
      if (!this.peticionPendiente()) { resolve(); return; }

      const inicio    = Date.now();
      const intervalo = setInterval(() => {
        if (!this.peticionPendiente() || Date.now() - inicio >= 12000) {
          clearInterval(intervalo);
          resolve();
        }
      }, 200);
    });
  }

  /* ──────────────────────────────────────────────────────────
     BLOQUEO DIARIO
  ────────────────────────────────────────────────────────── */
  private cargarCompletadoHoy(): CareoCompletado | null {
    const datos = localStorage.getItem(STORAGE_COMPLETADO);
    if (!datos) return null;
    const guardado = JSON.parse(datos) as CareoCompletado;
    return guardado.fecha === this.fechaHoy() ? guardado : null;
  }

  private guardarCompletadoHoy(resultado: ResultadoApi | null): void {
    const registro: CareoCompletado = { fecha: this.fechaHoy(), resultado };
    localStorage.setItem(STORAGE_COMPLETADO, JSON.stringify(registro));
    this.completadoHoy.set(registro);
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  /* ──────────────────────────────────────────────────────────
     NAVEGACIÓN Y HELPERS DE PLANTILLA
  ────────────────────────────────────────────────────────── */
  volverAlHub(): void {
    this.router.navigate(['/retos']);
  }

  get subTurnoInfo(): SubTurnoCareo | null {
    return this.secuencia[this.turnoActual()] ?? null;
  }

  get esTuTurno(): boolean {
    return this.subTurnoInfo?.quien === 'equipo';
  }

  formatearSegundos(seg: number): string {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private limpiarTimer(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
