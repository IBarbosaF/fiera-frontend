import { Injectable, signal } from '@angular/core';

/* ============================================================
   LigaService — Gestión del estado del wizard "Crear liga"

   No hay backend de ligas todavía → todo se persiste en
   localStorage, igual que DebateService con fiera_config.

   Estructura de este archivo:
   1. Tipos y enums de cada paso
   2. Interfaz ConfigLiga (estado completo del wizard)
   3. Valores por defecto (CONFIG_INICIAL)
   4. Servicio: signals + métodos (get/set/persistencia)
============================================================ */


/* ────────────────────────────────────────────────────────────
   1. TIPOS Y ENUMS — uno por paso del wizard
──────────────────────────────────────────────────────────── */

/** Paso 2 — Acceso */
export type TipoAcceso = 'publica' | 'privada' | 'clubes_invitados';

/** Paso 3 — Tipo de competición */
export type TipoCompeticion = 'academico' | 'careo';

/** Paso 5 — Pregunta a debatir */
export type ModoPregunta   = 'fija' | 'aleatoria';
export type OrigenPregunta = 'manual' | 'banco';

/** Paso 6 — Papel de FIERA */
export type RolFiera = 'juez' | 'rival';

/** Paso 7 — Reglas y fechas */
export type FrecuenciaLiga      = 'semanal' | 'quincenal' | 'mensual';
export type LimiteParticipantes = 'sin_limite' | '8' | '16' | '32' | 'personalizado';

/** Paso 4 — Estructura del debate (una fila por turno) */
export interface TurnoLiga {
  id      : string;
  nombre  : string;
  minutos : number;
  activo  : boolean;
}


/* ────────────────────────────────────────────────────────────
   2. CONFIGLIGA — estado completo del wizard, un bloque
   por paso para que sea fácil localizar cada campo
──────────────────────────────────────────────────────────── */

export interface ConfigLiga {

  /* ── Paso 1 — Información básica ── */
  nombre       : string;
  descripcion  : string;
  imagen       : string | null; // preview en base64

  /* ── Paso 2 — Acceso ── */
  acceso: TipoAcceso | null;

  /* ── Paso 3 — Tipo de competición ── */
  tipoCompeticion: TipoCompeticion | null;

  /* ── Paso 4 — Estructura del debate ── */
  estructura: TurnoLiga[];

  /* ── Paso 5 — Pregunta a debatir ── */
  modoPregunta             : ModoPregunta;
  mismaPreguntaTodasRondas : boolean;   // solo aplica si modoPregunta === 'fija'
  origenPregunta           : OrigenPregunta;
  pregunta                 : string;    // texto final de la pregunta (manual o elegida del banco)
  temaId                   : number | null; // id del tema si origenPregunta === 'banco'

  /* ── Paso 6 — Papel de FIERA ── */
  rolFiera: RolFiera | null;

  /* ── Paso 7 — Reglas y fechas ── */
  numeroDebates          : number;
  frecuencia             : FrecuenciaLiga;
  diasSemana             : string[];        // ['Lun', 'Mié', ...]
  hora                   : string;          // 'HH:mm'
  fechaInicio            : string;          // 'YYYY-MM-DD'
  maxParticipantes       : LimiteParticipantes;
  maxParticipantesCustom : number | null;   // solo si maxParticipantes === 'personalizado'
}


/* ────────────────────────────────────────────────────────────
   3. VALORES POR DEFECTO
──────────────────────────────────────────────────────────── */

/** Turnos base del Paso 4 — coincide con la estructura de un debate estándar */
const ESTRUCTURA_BASE: TurnoLiga[] = [
  { id: 'intro', nombre: 'Introducción',        minutos: 4, activo: true },
  { id: 'ref1',  nombre: 'Primera refutación',  minutos: 4, activo: true },
  { id: 'ref2',  nombre: 'Segunda refutación',  minutos: 4, activo: true },
  { id: 'concl', nombre: 'Conclusión',          minutos: 3, activo: true },
];

const CONFIG_INICIAL: ConfigLiga = {
  /* Paso 1 */
  nombre     : '',
  descripcion: '',
  imagen     : null,

  /* Paso 2 */
  acceso: null,

  /* Paso 3 */
  tipoCompeticion: null,

  /* Paso 4 */
  estructura: ESTRUCTURA_BASE.map(t => ({ ...t })),

  /* Paso 5 */
  modoPregunta            : 'fija',
  mismaPreguntaTodasRondas: true,
  origenPregunta          : 'manual',
  pregunta                : '',
  temaId                  : null,

  /* Paso 6 */
  rolFiera: null,

  /* Paso 7 */
  numeroDebates          : 8,
  frecuencia             : 'semanal',
  diasSemana             : [],
  hora                   : '18:00',
  fechaInicio            : '',
  maxParticipantes       : '16',
  maxParticipantesCustom : null,
};

/* Claves de almacenamiento */
const STORAGE_CONFIG_LIGA = 'fiera_liga_config';
const STORAGE_LIGAS       = 'fiera_ligas';

/* Límite de caracteres de la descripción (Paso 1) */
const DESCRIPCION_MAX_LEN = 200;


/* ────────────────────────────────────────────────────────────
   4. SERVICIO
──────────────────────────────────────────────────────────── */

@Injectable({
  providedIn: 'root'
})
export class LigaService {

  readonly DESCRIPCION_MAX_LEN = DESCRIPCION_MAX_LEN;

  /* ── Signal de estado ── */
  private _config = signal<ConfigLiga>({ ...CONFIG_INICIAL });

  /* ── Señal pública de solo lectura ── */
  config = this._config.asReadonly();

  /* ----------------------------------------------------------
     actualizarConfig()
     Aplica cambios parciales al estado del wizard.
     Método genérico usado por la mayoría de los pasos.
  ---------------------------------------------------------- */
  actualizarConfig(cambios: Partial<ConfigLiga>): void {
    this._config.update(actual => ({ ...actual, ...cambios }));
  }

  /* ----------------------------------------------------------
     Paso 4 — actualizarTurno()
     Actualiza un turno concreto de la estructura por su id
     (activo/inactivo, minutos, etc.) sin tocar el resto.
  ---------------------------------------------------------- */
  actualizarTurno(id: string, cambios: Partial<TurnoLiga>): void {
    const estructura = this._config().estructura.map(t =>
      t.id === id ? { ...t, ...cambios } : t
    );
    this.actualizarConfig({ estructura });
  }

  /* ----------------------------------------------------------
     Paso 7 — toggleDiaSemana()
     Añade o quita un día de la lista de días de la semana
     en los que se celebran los debates.
  ---------------------------------------------------------- */
  toggleDiaSemana(dia: string): void {
    const dias    = this._config().diasSemana;
    const nuevos  = dias.includes(dia)
      ? dias.filter(d => d !== dia)
      : [...dias, dia];
    this.actualizarConfig({ diasSemana: nuevos });
  }

  /* ----------------------------------------------------------
     guardarConfig() / cargarConfig() / resetConfig()
     Persistencia en localStorage del progreso del wizard
  ---------------------------------------------------------- */
  guardarConfig(): void {
    localStorage.setItem(STORAGE_CONFIG_LIGA, JSON.stringify(this._config()));
  }

  cargarConfig(): void {
    const datos = localStorage.getItem(STORAGE_CONFIG_LIGA);
    if (datos) this._config.set(JSON.parse(datos));
  }

  resetConfig(): void {
    this._config.set({
      ...CONFIG_INICIAL,
      estructura: ESTRUCTURA_BASE.map(t => ({ ...t })),
    });
    localStorage.removeItem(STORAGE_CONFIG_LIGA);
  }

  /* ----------------------------------------------------------
     Paso 8 — crearLiga()
     TODO: reemplazar con llamada real al backend cuando
     exista endpoint de ligas (POST /api/app/ligas/new-liga
     o similar). Por ahora guarda en localStorage como
     una liga más de la lista mock, igual que hacía
     ClubsService antes de conectar con el API real.
  ---------------------------------------------------------- */
  crearLiga(): { ok: boolean; id: number } {
    const ligas   = this.obtenerLigas();
    const nuevaId = ligas.length ? Math.max(...ligas.map((l: any) => l.id)) + 1 : 1;

    const nuevaLiga = {
      id: nuevaId,
      ...this._config(),
    };

    ligas.push(nuevaLiga);
    localStorage.setItem(STORAGE_LIGAS, JSON.stringify(ligas));

    /* Limpiar el wizard tras crear la liga con éxito */
    this.resetConfig();

    return { ok: true, id: nuevaId };
  }

  private obtenerLigas(): any[] {
    const datos = localStorage.getItem(STORAGE_LIGAS);
    return datos ? JSON.parse(datos) : [];
  }
}
