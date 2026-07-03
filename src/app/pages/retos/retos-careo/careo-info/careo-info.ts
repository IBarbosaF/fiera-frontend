import {
  Component,
  signal,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   CareoInfo — Modal informativo del Careo del día

   Se monta en el Home como componente hijo:
     <app-careo-info />

   El Home controla cuándo mostrarlo:
   · Si localStorage NO tiene 'careo_skip_info' → abre este modal
   · Si SÍ tiene 'careo_skip_info'              → navega directo a /careo-diario

   Este componente emite el evento (cerrado) al Home cuando
   el usuario cierra el modal o pulsa Comenzar.
============================================================ */

const STORAGE_SKIP = 'careo_skip_info';

/* ── Turno de la estructura del Careo ── */
interface TurnoCareo {
  nombre: string;
  tiempo: string;
  tipo  : 'favor' | 'contra';
  icono : string; // path SVG
}

/* ── Ítem de la sección "Cada día, un nuevo Careo" ── */
interface ItemDiario {
  texto: string;
  icono: string; // path SVG
}

@Component({
  selector        : 'app-careo-info',
  standalone      : true,
  imports         : [],
  templateUrl     : './careo-info.html',
  styleUrl        : './careo-info.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class CareoInfo {

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
     OUTPUT — avisa al Home cuando el modal se cierra
  ────────────────────────────────────────────────────────── */
  cerrado = output<void>();

  /* ──────────────────────────────────────────────────────────
     DATOS ESTÁTICOS
  ────────────────────────────────────────────────────────── */

  /** Los 4 turnos de la estructura del Careo */
  readonly turnos: TurnoCareo[] = [
    {
      nombre: 'Exposición a favor',
      tiempo: '1 – 2 mins',
      tipo  : 'favor',
      // person-speaking icon path
      icono : 'M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z',
    },
    {
      nombre: 'Exposición en contra',
      tiempo: '1 – 2 mins',
      tipo  : 'contra',
      icono : 'M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z',
    },
    {
      nombre: 'Réplica a favor',
      tiempo: '1 – 2 mins',
      tipo  : 'favor',
      // reply icon path
      icono : 'M9 17l-5-5 5-5v3h6a5 5 0 0 1 5 5v2h-2v-2a3 3 0 0 0-3-3H9v3z',
    },
    {
      nombre: 'Réplica en contra',
      tiempo: '1 – 2 mins',
      tipo  : 'contra',
      icono : 'M15 17l5-5-5-5v3H9a5 5 0 0 0-5 5v2h2v-2a3 3 0 0 1 3-3h6v3z',
    },
  ];

  /** Los 4 ítems de "Cada día, un nuevo Careo" */
  readonly itemsDiario: ItemDiario[] = [
    {
      texto: 'Cada día sale una pregunta de debate nueva, igual para todos los usuarios.',
      icono: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2zm3-9h.01M12 13h.01M16 13h.01',
    },
    {
      texto: 'Solo lo puedes hacer una vez al día.',
      icono: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    },
    {
      texto: 'Una vez que debates, la IA te dirá si ganas o pierdes y te dará puntos y feedback.',
      icono: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z',
    },
    {
      texto: 'Después de hacerlo, te aparecerá que ya has hecho el Careo del día.',
      icono: 'M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z',
    },
  ];

  /* ──────────────────────────────────────────────────────────
     API PÚBLICA — el Home llama a abrir()
  ────────────────────────────────────────────────────────── */

  /** El Home llama a este método al pulsar el botón Careo del día */
  abrir(): void {
    this.modalAbierto.set(true);
  }

  /* ──────────────────────────────────────────────────────────
     ACCIONES
  ────────────────────────────────────────────────────────── */

  /** Cierra el modal sin navegar */
  cerrar(): void {
    this.modalAbierto.set(false);
    this.cerrado.emit();
  }

  /** Cierra el modal si el click fue en el overlay (fuera del card) */
  cerrarFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('careo-overlay')) {
      this.cerrar();
    }
  }

  /** Alterna el checkbox y persiste en localStorage */
  toggleSkip(): void {
    const nuevoValor = !this.skipInfo();
    this.skipInfo.set(nuevoValor);
    localStorage.setItem(STORAGE_SKIP, String(nuevoValor));
  }

  /** Cierra el modal y navega al Careo diario */
  comenzar(): void {
    this.modalAbierto.set(false);
    this.router.navigate(['/careo-diario']);
  }
}
