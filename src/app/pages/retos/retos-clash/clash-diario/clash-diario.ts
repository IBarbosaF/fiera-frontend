import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   ClashDiario — Reto: encontrar el clash más importante del debate

   Mock por ahora: banco de temas con argumentos y clash correcto
   hardcodeados, con TODO para sustituir por el backend cuando
   FIERA tenga el endpoint de generación/evaluación de clashes.

   Dos modos, toggle en la misma pantalla:
   - Fácil:   elige 1 argumento a favor + 1 en contra entre opciones
   - Difícil: escribe/dicta tú cuáles son los 2 argumentos

   Bloqueo diario igual que Careo/Preguntón: localStorage con la
   fecha de hoy.
============================================================ */

const STORAGE_COMPLETADO = 'clash_reto_completado';

type ModoClash = 'facil' | 'dificil';

interface ArgumentoClash {
  id   : string;
  texto: string;
}

interface TemaClash {
  id           : number;
  pregunta     : string;
  favor        : ArgumentoClash[];
  contra       : ArgumentoClash[];
  clashCorrecto: {
    favorId     : string;
    contraId    : string;
    explicacion : string;
  };
}

interface ClashCompletado {
  fecha : string;
  modo  : ModoClash;
  puntos: number;
}

/* ── Banco mock de temas de Clash — TODO: sustituir por GET /api/app/clash/temas ── */
const BANCO_CLASH: TemaClash[] = [
  {
    id: 1,
    pregunta: '¿Deben los gobiernos regular el uso de la inteligencia artificial?',
    favor: [
      { id: 'f1', texto: 'Sin regulación, las empresas priorizarán beneficios sobre seguridad.' },
      { id: 'f2', texto: 'La IA puede automatizar decisiones discriminatorias sin control externo.' },
      { id: 'f3', texto: 'Otros sectores tecnológicos ya están regulados por su impacto social.' },
      { id: 'f4', texto: 'La regulación da confianza a los ciudadanos para adoptar la tecnología.' },
    ],
    contra: [
      { id: 'c1', texto: 'La regulación excesiva frena la innovación frente a otros países.' },
      { id: 'c2', texto: 'Los organismos públicos no tienen la capacidad técnica para regular bien.' },
      { id: 'c3', texto: 'Las normas quedarían obsoletas antes de aprobarse por la velocidad del sector.' },
      { id: 'c4', texto: 'La autorregulación de la industria ya cubre los riesgos principales.' },
    ],
    clashCorrecto: {
      favorId: 'f1',
      contraId: 'c1',
      explicacion: 'El choque central es seguridad vs. innovación: regular protege frente a abusos, pero puede frenar el desarrollo tecnológico frente a países sin esas trabas.',
    },
  },
  {
    id: 2,
    pregunta: '¿Debería ser obligatorio el voto en las elecciones?',
    favor: [
      { id: 'f1', texto: 'Aumenta la legitimidad democrática al reflejar a toda la población.' },
      { id: 'f2', texto: 'Reduce la influencia desproporcionada de los votantes más movilizados.' },
      { id: 'f3', texto: 'Fomenta el hábito cívico y el interés por la política.' },
      { id: 'f4', texto: 'Otros países con voto obligatorio muestran mayor participación sostenida.' },
    ],
    contra: [
      { id: 'c1', texto: 'Obligar a votar viola la libertad individual de abstenerse.' },
      { id: 'c2', texto: 'Puede generar votos aleatorios o en blanco sin reflexión real.' },
      { id: 'c3', texto: 'Es difícil de aplicar sin sanciones desproporcionadas.' },
      { id: 'c4', texto: 'No garantiza un voto informado, solo la asistencia física.' },
    ],
    clashCorrecto: {
      favorId: 'f1',
      contraId: 'c1',
      explicacion: 'El choque central es legitimidad democrática vs. libertad individual: votar refleja mejor a la sociedad, pero obligar restringe la libertad de no participar.',
    },
  },
  {
    id: 3,
    pregunta: '¿Debería subir la edad mínima para usar redes sociales?',
    favor: [
      { id: 'f1', texto: 'Protege la salud mental de los menores frente a la comparación social.' },
      { id: 'f2', texto: 'Reduce la exposición temprana a contenido inadecuado o adictivo.' },
      { id: 'f3', texto: 'Da más tiempo para desarrollar pensamiento crítico antes de exponerse.' },
      { id: 'f4', texto: 'Otros países ya han empezado a legislar en esa dirección.' },
    ],
    contra: [
      { id: 'c1', texto: 'Es casi imposible verificar la edad real de forma efectiva.' },
      { id: 'c2', texto: 'Aísla a los menores de espacios sociales donde ya está su entorno.' },
      { id: 'c3', texto: 'La responsabilidad debería recaer en las familias, no en la ley.' },
      { id: 'c4', texto: 'Puede empujar a los menores a plataformas menos reguladas aún.' },
    ],
    clashCorrecto: {
      favorId: 'f1',
      contraId: 'c1',
      explicacion: 'El choque central es protección vs. viabilidad: la medida busca cuidar la salud mental, pero su aplicación práctica es muy difícil de garantizar.',
    },
  },
];

@Component({
  selector        : 'app-clash-diario',
  standalone      : true,
  imports         : [],
  templateUrl     : './clash-diario.html',
  styleUrl        : './clash-diario.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClashDiario {

  constructor(private router: Router) {}

  /* ──────────────────────────────────────────────────────────
     TEMA DEL DÍA — mismo tema para todos, cambia cada 24h
  ────────────────────────────────────────────────────────── */
  readonly temaHoy: TemaClash = BANCO_CLASH[this.seedDelDia(this.fechaHoy()) % BANCO_CLASH.length];

  /* ──────────────────────────────────────────────────────────
     BLOQUEO DIARIO
  ────────────────────────────────────────────────────────── */
  completadoHoy = signal<ClashCompletado | null>(this.cargarCompletadoHoy());

  /* ──────────────────────────────────────────────────────────
     MODO — Fácil / Difícil
  ────────────────────────────────────────────────────────── */
  modo = signal<ModoClash>('facil');

  cambiarModo(m: ModoClash): void {
    if (this.enviado()) return; // no cambiar tras comprobar
    this.modo.set(m);
    this.favorSeleccionado.set(null);
    this.contraSeleccionado.set(null);
    this.favorTexto.set('');
    this.contraTexto.set('');
  }

  /* ──────────────────────────────────────────────────────────
     MODO FÁCIL — selección entre opciones
  ────────────────────────────────────────────────────────── */
  favorSeleccionado  = signal<string | null>(null);
  contraSeleccionado = signal<string | null>(null);

  seleccionarFavor(id: string): void {
    if (this.enviado()) return;
    this.favorSeleccionado.set(id);
  }

  seleccionarContra(id: string): void {
    if (this.enviado()) return;
    this.contraSeleccionado.set(id);
  }

  puedeComprobarFacil = computed(() =>
    this.favorSeleccionado() !== null && this.contraSeleccionado() !== null
  );

  /* ──────────────────────────────────────────────────────────
     MODO DIFÍCIL — texto libre (o dictado por mic, futuro)
  ────────────────────────────────────────────────────────── */
  favorTexto  = signal('');
  contraTexto = signal('');

  puedeComprobarDificil = computed(() =>
    this.favorTexto().trim().length > 0 && this.contraTexto().trim().length > 0
  );

  /* ──────────────────────────────────────────────────────────
     COMPROBAR RESPUESTA
  ────────────────────────────────────────────────────────── */
  enviado = signal(false);

  /** Resultado del modo fácil: qué acertó exactamente */
  resultadoFacil = signal<{ aciertoFavor: boolean; aciertoContra: boolean; puntos: number } | null>(null);

  comprobar(): void {
    if (this.modo() === 'facil') {
      if (!this.puedeComprobarFacil()) return;

      const aciertoFavor  = this.favorSeleccionado()  === this.temaHoy.clashCorrecto.favorId;
      const aciertoContra = this.contraSeleccionado() === this.temaHoy.clashCorrecto.contraId;
      const aciertos      = Number(aciertoFavor) + Number(aciertoContra);
      const puntos        = aciertos === 2 ? 10 : aciertos === 1 ? 5 : 0;

      this.resultadoFacil.set({ aciertoFavor, aciertoContra, puntos });
      this.enviado.set(true);
      this.guardarCompletadoHoy('facil', puntos);
    } else {
      if (!this.puedeComprobarDificil()) return;

      // TODO: enviar favorTexto/contraTexto a FIERA para evaluación real por IA.
      // De momento, participación fija: se muestra la corrección de FIERA sin
      // puntuar automáticamente el acierto exacto del texto libre.
      const puntos = 5;
      this.enviado.set(true);
      this.guardarCompletadoHoy('dificil', puntos);
    }
  }

  /* ──────────────────────────────────────────────────────────
     PERSISTENCIA — bloqueo diario
  ────────────────────────────────────────────────────────── */
  private cargarCompletadoHoy(): ClashCompletado | null {
    const datos = localStorage.getItem(STORAGE_COMPLETADO);
    if (!datos) return null;
    const guardado = JSON.parse(datos) as ClashCompletado;
    return guardado.fecha === this.fechaHoy() ? guardado : null;
  }

  private guardarCompletadoHoy(modo: ModoClash, puntos: number): void {
    const registro: ClashCompletado = { fecha: this.fechaHoy(), modo, puntos };
    localStorage.setItem(STORAGE_COMPLETADO, JSON.stringify(registro));
    this.completadoHoy.set(registro);
  }

  /* ──────────────────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────────────────── */
  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  /** Mismo hash determinista que DebateService.getTemaDelDia — TODO: unificar en un util compartido si se repite en más sitios */
  private seedDelDia(fecha: string): number {
    let hash = 0;
    for (let i = 0; i < fecha.length; i++) {
      hash = (hash << 5) - hash + fecha.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  volverAlHub(): void {
    this.router.navigate(['/retos']);
  }

  /** Argumento por id, para pintar el resultado final */
  argumentoPorId(lista: ArgumentoClash[], id: string): string {
    return lista.find(a => a.id === id)?.texto ?? '';
  }
}
