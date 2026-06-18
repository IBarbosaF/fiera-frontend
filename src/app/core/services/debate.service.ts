import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

/* ============================================================
   DebateService — Gestión del estado del debate
============================================================ */

const API_BASE = 'https://fiera.retorika.es';

/* ── Interfaces de la API ── */

export interface TemaApi {
  id       : number;
  categoria: string;
  enunciado: string;
  torneo   : string;
  año      : number;
}

export interface FieraApi {
  id          : number;
  personalidad: string;
  descripcion : string;
}

export interface TiemposDebate {
  intro     : number;
  ref1      : number;
  ref2      : number;
  conclusion: number;
}

export interface TurnosDebate {
  intro     : 'equipo' | 'fiera';
  ref1      : 'equipo' | 'fiera';
  ref2      : 'equipo' | 'fiera';
  conclusion: 'equipo' | 'fiera';
}

export interface TemaDebate {
  id?      : number;
  enunciado: string;
  categoria: string;
  manual?  : boolean;
}

export interface ConfigDebate {
  tiempos      : TiemposDebate;
  dificultad   : 'basico' | 'medio' | 'avanzado';
  modo         : 'completo' | 'express';
  postura      : 'favor' | 'contra' | 'aleatoria';
  tema         : TemaDebate | null;
  personalidad : 'agresiva' | 'elegante' | 'sarcastica' | null;
  turnos       : TurnosDebate;
}

export interface Resultados {
  argumentacion: number;
  claridad     : number;
  refutacion   : number;
  evidencia    : number;
}

export interface SubTurnoConfig {
  id      : string;
  nombre  : string;
  postura : 'favor' | 'contra';
  minutos : number;
  activo  : boolean;
  asignado: 'yo' | 'fiera' | 'companero';
}

export interface IntervencionRequest {
  nombre          : string;
  duracion        : string;
  speaker         : string;
  postura         : string;
  mensaje         : string;
  estado          : string;
  speakerInputType: string;
}

export interface DebateRequest {
  modo          : string;
  dificultad    : string;
  status        : string;
  creadoA       : string;
  temaElegido   : string;
  posturaFiera  : string;
  usuarios      : { id: number }[];
  tema          : { id: number } | null;
  fiera         : { id: number };
  intervenciones: IntervencionRequest[];
  resultado     : null;
}

export interface RespuestaFiera {
  mensaje: string;
  audio  : any;
}

export interface ProcesarTurnoResponse {
  debateResponse: any;
  respuestaFiera: RespuestaFiera;
}

export interface IntervencionApi {
  id              : number;
  nombre          : string;
  duracion        : string;
  speaker         : string;
  postura         : string;
  mensaje         : string;
  estado          : string;
  speakerInputType: string;
}

export interface DebateApi {
  id            : number;
  intervenciones: IntervencionApi[];
  fiera         : { id: number; personalidad: string };
  resultado     : any;
}

/* ── Constantes de almacenamiento ── */
const STORAGE_CONFIG     = 'fiera_config';
const STORAGE_RESULTADOS = 'fiera_resultados';
const STORAGE_DEBATE_ID  = 'fiera_debate_id';
const STORAGE_SUBTURNOS  = 'fiera_subturnos';
const STORAGE_DEBATE_ACT = 'fiera_debate_activo';

/* ── Mapa nombre wizard → nombre backend ── */
const NOMBRE_MAP: Record<string, string> = {
  'Introducción' : 'introductor',
  '1ª Refutación': 'refutador1',
  '2ª Refutación': 'refutador2',
  '3ª Refutación': 'refutador3',
  '4ª Refutación': 'refutador4',
  'Conclusión'   : 'conclusor',
};

const CONFIG_INICIAL: ConfigDebate = {
  tiempos: {
    intro     : 3,
    ref1      : 4,
    ref2      : 5,
    conclusion: 3,
  },
  dificultad  : 'medio',
  modo        : 'completo',
  postura     : 'aleatoria',
  tema        : null,
  personalidad: null,
  turnos: {
    intro     : 'equipo',
    ref1      : 'equipo',
    ref2      : 'equipo',
    conclusion: 'equipo',
  }
};

@Injectable({
  providedIn: 'root'
})
export class DebateService {

  private http = inject(HttpClient);

  /* ── Signals de estado ── */
  private _config       = signal<ConfigDebate>({ ...CONFIG_INICIAL });
  private _debateId     = signal<number | null>(null);
  private _fieras       = signal<FieraApi[]>([]);
  private _subturnos    = signal<SubTurnoConfig[]>([]);
  private _debateActivo = signal<DebateApi | null>(null);

  /* ── Señales públicas de solo lectura ── */
  config       = this._config.asReadonly();
  debateId     = this._debateId.asReadonly();
  fieras       = this._fieras.asReadonly();
  subturnos    = this._subturnos.asReadonly();
  debateActivo = this._debateActivo.asReadonly();

  /* ----------------------------------------------------------
     getFieras()
     Carga las FIERAs del backend y las cachea en el signal
  ---------------------------------------------------------- */
  getFieras() {
    return this.http.get<FieraApi[]>(`${API_BASE}/api/app/fieras`).pipe(
      tap(fieras => this._fieras.set(fieras))
    );
  }

  /* Devuelve el id de la FIERA según la personalidad elegida */
  getFieraId(personalidad: string): number | null {
    const fiera = this._fieras().find(
      f => f.personalidad.toLowerCase() === personalidad.toLowerCase()
    );
    return fiera?.id ?? null;
  }

  /* ----------------------------------------------------------
     getTemas()
     Obtiene el banco de temas del backend
  ---------------------------------------------------------- */
  getTemas() {
    return this.http.get<TemaApi[]>(`${API_BASE}/api/app/temas`);
  }

  /* ----------------------------------------------------------
     guardarSubturnos() / cargarSubturnos()
     Persiste los subturnos expandidos del wizard
  ---------------------------------------------------------- */
  guardarSubturnos(subturnos: SubTurnoConfig[]): void {
    this._subturnos.set(subturnos);
    localStorage.setItem(STORAGE_SUBTURNOS, JSON.stringify(subturnos));
  }

  cargarSubturnos(): SubTurnoConfig[] {
    if (this._subturnos().length) return this._subturnos();
    const datos = localStorage.getItem(STORAGE_SUBTURNOS);
    if (datos) {
      const lista = JSON.parse(datos) as SubTurnoConfig[];
      this._subturnos.set(lista);
      return lista;
    }
    return [];
  }

  /* ----------------------------------------------------------
     crearDebate()
     Construye el body desde los subturnos del wizard y envía
     POST /api/app/debates/new-debate
  ---------------------------------------------------------- */
  crearDebate() {
    const config    = this._config();
    const subturnos = this.cargarSubturnos();

    /* Calcular postura del usuario y de FIERA */
    const posturaUsuario = config.postura === 'aleatoria'
      ? (Math.random() > 0.5 ? 'pro' : 'contra')
      : config.postura === 'favor' ? 'pro' : 'contra';
    const posturaFiera = posturaUsuario === 'pro' ? 'contra' : 'pro';

    /* Construir intervenciones desde los subturnos del wizard */
    const intervenciones: IntervencionRequest[] = subturnos.map(t => ({
      nombre          : NOMBRE_MAP[t.nombre] ?? t.nombre.toLowerCase(),
      duracion        : `00:${String(t.minutos).padStart(2, '0')}:00`,
      speaker         : t.asignado === 'fiera' ? 'fiera' : 'usuario',
      postura         : t.postura === 'favor' ? posturaUsuario : posturaFiera,
      mensaje         : '',
      estado          : 'PENDING',
      speakerInputType: 'text'
    }));

    /* Obtener fiera_id dinámicamente */
    const fieraId = config.personalidad
      ? (this.getFieraId(config.personalidad) ?? 1)
      : 1;

    const body: DebateRequest = {
      modo         : config.modo,
      dificultad   : config.dificultad,
      status       : 'CREATED',
      creadoA      : new Date().toISOString(),
      temaElegido  : config.tema?.enunciado ?? '',
      posturaFiera,
      usuarios     : [{ id: 4 }], // TODO: reemplazar con id real del usuario logueado
      tema         : config.tema?.id ? { id: config.tema.id } : null,
      fiera        : { id: fieraId },
      intervenciones,
      resultado    : null
    };

    return this.http.post<any>(`${API_BASE}/api/app/debates/new-debate`, body);
  }

  /* ----------------------------------------------------------
     setDebateId() / getDebateId()
  ---------------------------------------------------------- */
  setDebateId(id: number): void {
    this._debateId.set(id);
    localStorage.setItem(STORAGE_DEBATE_ID, String(id));
  }

  getDebateId(): number | null {
    if (this._debateId()) return this._debateId();
    const stored = localStorage.getItem(STORAGE_DEBATE_ID);
    return stored ? Number(stored) : null;
  }

  /* ----------------------------------------------------------
     setDebateActivo() / getDebateActivo()
     Guarda el debate completo con intervenciones y sus ids
     para poder referenciarlos durante la partida
  ---------------------------------------------------------- */
  setDebateActivo(debate: DebateApi): void {
    this._debateActivo.set(debate);
    localStorage.setItem(STORAGE_DEBATE_ACT, JSON.stringify(debate));
  }

  getDebateActivo(): DebateApi | null {
    if (this._debateActivo()) return this._debateActivo();
    const stored = localStorage.getItem(STORAGE_DEBATE_ACT);
    return stored ? JSON.parse(stored) : null;
  }

  /* ----------------------------------------------------------
     procesarTurno()
     Envía el texto del usuario al backend y recibe
     la respuesta de FIERA.
     Usa FormData porque el endpoint acepta también audio.
  ---------------------------------------------------------- */
  procesarTurno(debateId: number, turnId: number, texto: string) {
    const formData = new FormData();
    formData.append('text', texto);

    return this.http.post<ProcesarTurnoResponse>(
      `${API_BASE}/api/app/debates/${debateId}/turnos/${turnId}`,
      formData
    );
  }

  /* ----------------------------------------------------------
     actualizarConfig()
  ---------------------------------------------------------- */
  actualizarConfig(cambios: Partial<ConfigDebate>): void {
    this._config.update(actual => ({ ...actual, ...cambios }));
  }

  /* ----------------------------------------------------------
     guardarConfig() / cargarConfig() / resetConfig()
  ---------------------------------------------------------- */
  guardarConfig(): void {
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(this._config()));
  }

  cargarConfig(): void {
    const datos = localStorage.getItem(STORAGE_CONFIG);
    if (datos) this._config.set(JSON.parse(datos));
  }

  resetConfig(): void {
    this._config.set({ ...CONFIG_INICIAL });
  }

  /* ----------------------------------------------------------
     guardarResultados() / obtenerResultados()
  ---------------------------------------------------------- */
  guardarResultados(resultados: Resultados): void {
    localStorage.setItem(STORAGE_RESULTADOS, JSON.stringify(resultados));
  }

  obtenerResultados(): Resultados | null {
    const datos = localStorage.getItem(STORAGE_RESULTADOS);
    return datos ? JSON.parse(datos) : null;
  }
}
