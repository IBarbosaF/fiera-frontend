import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/* ============================================================
   DebateService — Gestión del estado del debate

   Centraliza toda la configuración y estado del debate.
   TODO: reemplazar localStorage por llamadas al backend
         cuando la API esté lista.
============================================================ */

const API_BASE = 'http://fiera.retorika.es';

export interface TemaApi {
  id       : number;
  categoria: string;
  enunciado: string;
  torneo   : string;
  año      : number;
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
  enunciado: string;   /* antes: pregunta */
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

const STORAGE_CONFIG     = 'fiera_config';
const STORAGE_RESULTADOS = 'fiera_resultados';

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

  /* Signal con la configuración actual del debate */
  private _config = signal<ConfigDebate>({ ...CONFIG_INICIAL });

  /* Config accesible desde cualquier componente */
  config = this._config.asReadonly();

  /* ----------------------------------------------------------
     getTemas()
     Obtiene el banco de temas del backend
  ---------------------------------------------------------- */
  getTemas() {
    return this.http.get<TemaApi[]>(`${API_BASE}/api/app/temas`);
  }

  /* ----------------------------------------------------------
     actualizarConfig()
     Actualiza parcialmente la configuración del debate
  ---------------------------------------------------------- */
  actualizarConfig(cambios: Partial<ConfigDebate>): void {
    this._config.update(actual => ({ ...actual, ...cambios }));
  }

  /* ----------------------------------------------------------
     guardarConfig()
     Persiste la config en localStorage antes de iniciar debate
     TODO: enviar al backend cuando esté disponible
  ---------------------------------------------------------- */
  guardarConfig(): void {
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(this._config()));
  }

  /* ----------------------------------------------------------
     cargarConfig()
     Recupera la config guardada al entrar al debate
     TODO: obtener del backend cuando esté disponible
  ---------------------------------------------------------- */
  cargarConfig(): void {
    const datos = localStorage.getItem(STORAGE_CONFIG);
    if (datos) {
      this._config.set(JSON.parse(datos));
    }
  }

  /* ----------------------------------------------------------
     resetConfig()
     Resetea la configuración a los valores iniciales
  ---------------------------------------------------------- */
  resetConfig(): void {
    this._config.set({ ...CONFIG_INICIAL });
  }

  /* ----------------------------------------------------------
     guardarResultados()
     Guarda las puntuaciones al finalizar el debate
     TODO: enviar al backend cuando esté disponible
  ---------------------------------------------------------- */
  guardarResultados(resultados: Resultados): void {
    localStorage.setItem(STORAGE_RESULTADOS, JSON.stringify(resultados));
  }

  /* ----------------------------------------------------------
     obtenerResultados()
     Recupera las puntuaciones para mostrarlas en resultados
     TODO: obtener del backend cuando esté disponible
  ---------------------------------------------------------- */
  obtenerResultados(): Resultados | null {
    const datos = localStorage.getItem(STORAGE_RESULTADOS);
    return datos ? JSON.parse(datos) : null;
  }
}
