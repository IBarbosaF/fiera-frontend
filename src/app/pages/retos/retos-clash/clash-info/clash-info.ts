import {
  Component,
  signal,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   ClashInfo — Modal informativo del Clash del día

   Se monta en el RetosHub (o donde se lance Clash) como
   componente hijo:
     <app-clash-info />

   Quien lo monta controla cuándo mostrarlo:
   · Si localStorage NO tiene 'clash_skip_info' → abre este modal
   · Si SÍ tiene 'clash_skip_info'              → navega directo a /retos/clash

   Emite (cerrado) cuando el usuario cierra el modal o pulsa Comenzar.
============================================================ */

const STORAGE_SKIP = 'clash_skip_info';

/* ── Paso del proceso (Lee → Revisa → Elige → Corrige) ── */
interface PasoClash {
  texto: string;
  icono: string; // path SVG
}

/* ── Modo de juego (Fácil / Difícil) ── */
interface ModoJuego {
  nivel : 'facil' | 'dificil';
  titulo: string;
  desc  : string;
  icono : string; // path SVG
}

@Component({
  selector        : 'app-clash-info',
  standalone      : true,
  imports         : [],
  templateUrl     : './clash-info.html',
  styleUrl        : './clash-info.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClashInfo {

  constructor(private router: Router) {}

  /* ──────────────────────────────────────────────────────────
     ESTADO
  ────────────────────────────────────────────────────────── */

  /** Controla si el modal está visible */
  modalAbierto = signal<boolean>(false);

  /** Refleja el valor del checkbox "No mostrar más" */
  skipInfo = signal<boolean>(
    localStorage.getItem(STORAGE_SKIP) === 'true'
  );

  /* ──────────────────────────────────────────────────────────
     OUTPUT — avisa a quien lo monta cuando el modal se cierra
  ────────────────────────────────────────────────────────── */
  cerrado = output<void>();

  /* ──────────────────────────────────────────────────────────
     DATOS ESTÁTICOS
  ────────────────────────────────────────────────────────── */

  /** Los 4 pasos del proceso del Clash */
  readonly pasos: PasoClash[] = [
    {
      texto: 'Lee la pregunta de debate.',
      // help-circle icon path
      icono: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-8.5c0-1.5 1-2 1.8-2.5.6-.4 1-.7 1-1.3 0-.7-.6-1.2-1.5-1.2s-1.5.5-1.6 1.3h-1.9c.1-1.8 1.5-3 3.5-3s3.4 1.1 3.4 2.8c0 1.2-.7 1.8-1.6 2.4-.7.5-1.1.8-1.1 1.5v.3h-1.9v-.3zm.9 4.3c-.7 0-1.2-.5-1.2-1.1s.5-1.1 1.2-1.1 1.2.5 1.2 1.1-.5 1.1-1.2 1.1z',
    },
    {
      texto: 'Revisa los argumentos a favor y en contra.',
      // scale / balance icon path
      icono: 'M12 3v18M4 8l3-3 3 3M4 8a4 4 0 0 0 6 0M14 8l3-3 3 3M14 8a4 4 0 0 0 6 0M7 21h10',
    },
    {
      texto: 'Elige los 2 argumentos más potentes.',
      // check-square icon path
      icono: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    },
    {
      texto: 'FIERA te corrige y te explica por qué.',
      // trophy icon path
      icono: 'M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM7 4H3v2a4 4 0 0 0 4 4M17 4h4v2a4 4 0 0 1-4 4',
    },
  ];

  /** Los 2 modos de juego */
  readonly modos: ModoJuego[] = [
    {
      nivel : 'facil',
      titulo: 'FÁCIL',
      desc  : 'Elige los 2 argumentos más potentes entre las opciones.',
      // list icon path
      icono : 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    },
    {
      nivel : 'dificil',
      titulo: 'DIFÍCIL',
      desc  : 'Tú propones cuáles son los 2 argumentos más potentes y FIERA te corrige.',
      // brain icon path
      icono : 'M9.5 2A3.5 3.5 0 0 0 6 5.5v.634A3.5 3.5 0 0 0 4 9.5a3.5 3.5 0 0 0 .5 6.83 3.5 3.5 0 0 0 3 3.67h1V19h2V4h-1zM14.5 2A3.5 3.5 0 0 1 18 5.5v.634A3.5 3.5 0 0 1 20 9.5a3.5 3.5 0 0 1-.5 6.83 3.5 3.5 0 0 1-3 3.67h-1V19h-2V4h1z',
    },
  ];

  /** Pregunta de ejemplo mostrada en el modal */
  readonly preguntaEjemplo =
    '¿Deben los gobiernos regular el uso de la inteligencia artificial?';

  /* ──────────────────────────────────────────────────────────
     API PÚBLICA — quien lo monta llama a abrir()
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
    if ((event.target as HTMLElement).classList.contains('clash-overlay')) {
      this.cerrar();
    }
  }

  toggleSkip(): void {
    const nuevoValor = !this.skipInfo();
    this.skipInfo.set(nuevoValor);
    localStorage.setItem(STORAGE_SKIP, String(nuevoValor));
  }

  /** Cierra el modal y navega a la pantalla del Clash */
  comenzar(): void {
    this.modalAbierto.set(false);
    this.router.navigate(['/clash-diario']);
  }
}
