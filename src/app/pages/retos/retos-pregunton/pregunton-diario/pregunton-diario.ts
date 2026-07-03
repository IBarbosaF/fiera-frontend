import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   PreguntonDiario — Pantalla del reto Preguntón

   Muestra la pregunta de debate del día (creada por un usuario),
   permite valorarla de 0 a 3 corazones, y debajo lista el
   ranking completo de preguntas mejor valoradas.

   Bloqueo diario: una vez votado, se guarda en localStorage
   bajo la fecha de hoy y la pantalla pasa a modo "ya has votado".

   TODO: reemplazar mock data y localStorage por llamadas reales
   al backend cuando exista el endpoint de Preguntón.
============================================================ */

const STORAGE_VOTO = 'pregunton_voto';

interface PreguntaDia {
  id       : number;
  pregunta : string;
  usuario  : string;
  iniciales: string;
  fecha    : string; // YYYY-MM-DD
}

interface RankingItem {
  posicion  : number;
  pregunta  : string;
  usuario   : string;
  iniciales : string;
  corazones : number; // valoración media, 0-3
  votos     : number; // nº de votos recibidos
}

interface VotoGuardado {
  preguntaId: number;
  fecha     : string;
  corazones : number;
}

@Component({
  selector        : 'app-pregunton-diario',
  standalone      : true,
  imports         : [],
  templateUrl     : './pregunton-diario.html',
  styleUrl        : './pregunton-diario.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class PreguntonDiario {

  constructor(private router: Router) {}

  /* ──────────────────────────────────────────────────────────
     PREGUNTA DEL DÍA — mock, TODO: GET /api/app/pregunton/hoy
  ────────────────────────────────────────────────────────── */
  readonly preguntaHoy: PreguntaDia = {
    id       : 101,
    pregunta : '¿Deben los gobiernos regular el uso de la inteligencia artificial?',
    usuario  : '@DebatientePro',
    iniciales: 'DP',
    fecha    : this.fechaHoy(),
  };

  /* ──────────────────────────────────────────────────────────
     RANKING COMPLETO — mock, TODO: GET /api/app/pregunton/ranking
  ────────────────────────────────────────────────────────── */
  readonly ranking = signal<RankingItem[]>([
    { posicion: 1, pregunta: '¿Deberían prohibirse los móviles en los colegios?', usuario: '@DebatientePro', iniciales: 'DP', corazones: 2.8, votos: 134 },
    { posicion: 2, pregunta: '¿Es la IA una amenaza para el empleo?',              usuario: '@VozClara',      iniciales: 'VC', corazones: 2.5, votos: 98  },
    { posicion: 3, pregunta: '¿Debería el voto ser obligatorio?',                  usuario: '@Argumentador',  iniciales: 'AR', corazones: 2.1, votos: 76  },
    { posicion: 4, pregunta: '¿Debe subir la edad mínima para redes sociales?',    usuario: '@LogicaPura',    iniciales: 'LP', corazones: 1.9, votos: 61  },
    { posicion: 5, pregunta: '¿Debería ser gratuita la educación universitaria?',  usuario: '@RetoricaViva',  iniciales: 'RV', corazones: 1.6, votos: 54  },
  ]);

  /* ──────────────────────────────────────────────────────────
     ESTADO DEL VOTO
  ────────────────────────────────────────────────────────── */

  /** Corazones seleccionados por el usuario ANTES de confirmar (0-3) */
  seleccion = signal<number>(0);

  /** El voto ya guardado hoy para esta pregunta, si existe */
  votoGuardado = signal<VotoGuardado | null>(this.cargarVotoHoy());

  /** true si ya se votó la pregunta de hoy */
  yaVotado = computed(() => this.votoGuardado() !== null);

  /** Corazones a mostrar: los guardados si ya votó, si no la selección actual */
  corazonesMostrados = computed(() =>
    this.yaVotado() ? this.votoGuardado()!.corazones : this.seleccion()
  );

  /* ──────────────────────────────────────────────────────────
     ACCIONES
  ────────────────────────────────────────────────────────── */

  /** Selecciona N corazones (0-3) mientras no se haya votado aún */
  seleccionar(n: number): void {
    if (this.yaVotado()) return;
    this.seleccion.set(n);
  }

  /** Confirma el voto, lo persiste y bloquea la pantalla hasta mañana */
  enviarVoto(): void {
    if (this.yaVotado()) return;

    const voto: VotoGuardado = {
      preguntaId: this.preguntaHoy.id,
      fecha     : this.fechaHoy(),
      corazones : this.seleccion(),
    };

    localStorage.setItem(STORAGE_VOTO, JSON.stringify(voto));
    this.votoGuardado.set(voto);

    // TODO: POST /api/app/pregunton/{id}/votar { corazones }
  }

  /** Vuelve al hub de retos */
  volverAlHub(): void {
    this.router.navigate(['/retos']);
  }

  /* ──────────────────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────────────────── */

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /** Lee el voto guardado en localStorage solo si es de hoy */
  private cargarVotoHoy(): VotoGuardado | null {
    const datos = localStorage.getItem(STORAGE_VOTO);
    if (!datos) return null;

    const voto = JSON.parse(datos) as VotoGuardado;
    return voto.fecha === this.fechaHoy() ? voto : null;
  }

  /** Array de 3 booleanos para pintar corazones llenos/vacíos en el ranking */
  corazonesRanking(valor: number): boolean[] {
    return [0, 1, 2].map(i => i < Math.round(valor));
  }

  medallaClase(posicion: number): string {
    if (posicion === 1) return 'oro';
    if (posicion === 2) return 'plata';
    if (posicion === 3) return 'bronce';
    return '';
  }
}
