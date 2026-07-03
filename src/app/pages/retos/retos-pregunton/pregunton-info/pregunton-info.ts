import {
  Component,
  signal,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   PreguntonInfo — Modal informativo del Preguntón del día

   Se monta como componente hijo:
     <app-pregunton-info />

   Quien lo monta controla cuándo mostrarlo:
   · Si localStorage NO tiene 'pregunton_skip_info' → abre este modal
   · Si SÍ tiene 'pregunton_skip_info'              → navega directo a /retos/pregunton

   Emite (cerrado) cuando el usuario cierra el modal o pulsa Comenzar.
============================================================ */

const STORAGE_SKIP = 'pregunton_skip_info';

/* ── Paso de "¿Cómo funciona?" ── */
interface PasoPregunton {
  numero: number;
  titulo: string;
  desc  : string;
  icono : string; // path SVG
}

/* ── Ítem del mini-ranking de ejemplo ── */
interface PreguntaRanking {
  posicion  : number;
  pregunta  : string;
  usuario   : string;
  iniciales : string;
  corazones : number; // 0-3, corazones "llenos"
}

@Component({
  selector        : 'app-pregunton-info',
  standalone      : true,
  imports         : [],
  templateUrl     : './pregunton-info.html',
  styleUrl        : './pregunton-info.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class PreguntonInfo {

  constructor(private router: Router) {}

  /* ──────────────────────────────────────────────────────────
     ESTADO
  ────────────────────────────────────────────────────────── */

  modalAbierto = signal<boolean>(false);

  skipInfo = signal<boolean>(
    localStorage.getItem(STORAGE_SKIP) === 'true'
  );

  cerrado = output<void>();

  /* ──────────────────────────────────────────────────────────
     DATOS ESTÁTICOS
  ────────────────────────────────────────────────────────── */

  /** Bloque "¿Para qué sirve?" */
  readonly paraQueSirve =
    'Así sabemos cuáles son las mejores preguntas de debate, las más valoradas por la comunidad.';

  /** Los 3 pasos de "¿Cómo funciona?" */
  readonly pasos: PasoPregunton[] = [
    {
      numero: 1,
      titulo: 'Cada día',
      desc  : 'Te aparece una pregunta de debate creada por otro usuario.',
      // calendar icon path
      icono : 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
    },
    {
      numero: 2,
      titulo: 'Calífícala',
      desc  : 'Dale ningún corazón, 1, 2 o 3 corazones según te guste.',
      // heart icon path
      icono : 'M12 21s-6.5-4.35-9.5-8.5C.5 9.5 2 6 5.5 6c2 0 3.5 1.2 4.5 2.6C11 7.2 12.5 6 14.5 6 18 6 19.5 9.5 21.5 12.5 18.5 16.65 12 21 12 21z',
    },
    {
      numero: 3,
      titulo: 'Ranking',
      desc  : 'Las preguntas se ordenan de mejores a peores valoradas.',
      // podium icon path
      icono : 'M4 21h16M6 21v-6h4v6M14 21v-9h4v9M10 21v-3h0',
    },
  ];

  /** Bloque final "Tú decides qué preguntas son las mejores" */
  readonly footerTexto =
    'Tú decides qué preguntas son las mejores. Tu voto hace crecer a la comunidad.';

  /** Top 3 de ejemplo para "Explora el ranking" */
  readonly rankingPreview: PreguntaRanking[] = [
    {
      posicion : 1,
      pregunta : '¿Deberían prohibirse los móviles en los colegios?',
      usuario  : '@DebatientePro',
      iniciales: 'DP',
      corazones: 3,
    },
    {
      posicion : 2,
      pregunta : '¿Es la IA una amenaza para el empleo?',
      usuario  : '@VozClara',
      iniciales: 'VC',
      corazones: 2,
    },
    {
      posicion : 3,
      pregunta : '¿Debería el voto ser obligatorio?',
      usuario  : '@Argumentador',
      iniciales: 'AR',
      corazones: 1,
    },
  ];

  /* ──────────────────────────────────────────────────────────
     API PÚBLICA
  ────────────────────────────────────────────────────────── */

  abrir(): void {
    this.modalAbierto.set(true);
  }

  /* ──────────────────────────────────────────────────────────
     ACCIONES
  ────────────────────────────────────────────────────────── */

  cerrar(): void {
    this.modalAbierto.set(false);
    this.cerrado.emit();
  }

  cerrarFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('pregunton-overlay')) {
      this.cerrar();
    }
  }

  toggleSkip(): void {
    const nuevoValor = !this.skipInfo();
    this.skipInfo.set(nuevoValor);
    localStorage.setItem(STORAGE_SKIP, String(nuevoValor));
  }

  /** Cierra el modal y navega a la pantalla del Preguntón */
  comenzar(): void {
    this.modalAbierto.set(false);
    this.router.navigate(['/pregunton-diario']);
  }

  /** Helper para pintar los 3 corazones (llenos/vacíos) de cada fila del ranking */
  corazonesArray(corazones: number): boolean[] {
    return [0, 1, 2].map(i => i < corazones);
  }

  /** Color de medalla según posición — usado con [class] en el HTML */
  medallaClase(posicion: number): string {
    return posicion === 1 ? 'oro' : posicion === 2 ? 'plata' : 'bronce';
  }
}
