import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/* ============================================================
   LigaService — Gestión del estado del wizard "Crear liga"
   y creación real contra el backend.

   Estructura de este archivo:
   1. Tipos y enums de cada paso (estado interno del wizard)
   2. Interfaz ConfigLiga (estado completo del wizard)
   3. Valores por defecto (CONFIG_INICIAL)
   4. Contrato con el backend (LigaRequest / LigaResponse)
      + tablas de mapeo minúsculas → MAYÚSCULAS
   5. Servicio: signals + métodos (get/set/persistencia/API)

   NOTA sobre "estructura del debate" (antiguo Paso 4):
   se quitó del wizard porque el modelo Liga del backend NO
   tiene ningún campo para turnos/minutos — confirmado con
   el schema real. Si en el futuro los debates de una liga
   necesitan una plantilla de turnos, probablemente viva en
   el objeto Debate individual (como ya usa debate.service.ts
   con `intervenciones`), no aquí.
============================================================ */


/* ────────────────────────────────────────────────────────────
   1. TIPOS Y ENUMS — uno por paso del wizard (minúsculas,
   uso interno en signals/UI; se mapean a MAYÚSCULAS solo al
   construir el body de la petición, ver sección 4)
──────────────────────────────────────────────────────────── */

/** Paso 2 — Acceso */
export type TipoAcceso = 'publica' | 'privada' | 'clubes_invitados';

/** Paso 3 — Tipo de competición */
export type TipoCompeticion = 'academico' | 'careo';

/** Paso 4 — Pregunta a debatir */
export type ModoPregunta   = 'fija' | 'aleatoria';
export type OrigenPregunta = 'manual' | 'banco';

/** Paso 5 — Papel de FIERA */
export type RolFiera = 'juez' | 'rival';

/** Paso 6 — Reglas y fechas */
export type FrecuenciaLiga      = 'semanal' | 'quincenal' | 'mensual';
export type LimiteParticipantes = 'sin_limite' | '8' | '16' | '32' | 'personalizado';


/* ────────────────────────────────────────────────────────────
   2. CONFIGLIGA — estado completo del wizard, un bloque
   por paso para que sea fácil localizar cada campo
──────────────────────────────────────────────────────────── */

export interface ConfigLiga {

  /* ── Paso 1 — Información básica ── */
  nombre       : string;
  descripcion  : string;
  imagen       : string | null; // preview en base64, se convierte a Blob al enviar

  /* ── Paso 2 — Acceso ── */
  acceso: TipoAcceso | null;

  /* ── Paso 3 — Tipo de competición ── */
  tipoCompeticion: TipoCompeticion | null;

  /* ── Paso 4 — Pregunta a debatir ── */
  modoPregunta             : ModoPregunta;
  mismaPreguntaTodasRondas : boolean;   // solo aplica si modoPregunta === 'fija'
  origenPregunta           : OrigenPregunta;
  pregunta                 : string;    // texto final de la pregunta (manual o elegida del banco)
  temaId                   : number | null; // id del tema si origenPregunta === 'banco'

  /* ── Paso 5 — Papel de FIERA ── */
  rolFiera: RolFiera | null;

  /* ── Paso 6 — Reglas y fechas ──
     El backend solo admite UN día de la semana por liga,
     no una lista → "diaSemana" singular. */
  numeroDebates          : number;
  frecuencia             : FrecuenciaLiga;
  diaSemana               : string | null;
  hora                   : string;          // 'HH:mm'
  fechaInicio            : string;          // 'YYYY-MM-DD'
  maxParticipantes       : LimiteParticipantes;
  maxParticipantesCustom : number | null;   // solo si maxParticipantes === 'personalizado'
}


/* ────────────────────────────────────────────────────────────
   3. VALORES POR DEFECTO
──────────────────────────────────────────────────────────── */

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
  modoPregunta            : 'fija',
  mismaPreguntaTodasRondas: true,
  origenPregunta          : 'manual',
  pregunta                : '',
  temaId                  : null,

  /* Paso 5 */
  rolFiera: null,

  /* Paso 6 */
  numeroDebates          : 8,
  frecuencia             : 'semanal',
  diaSemana              : null,
  hora                   : '18:00',
  fechaInicio            : '',
  maxParticipantes       : '16',
  maxParticipantesCustom : null,
};

/* Claves de almacenamiento */
const STORAGE_CONFIG_LIGA = 'fiera_liga_config';
const STORAGE_LIGAS       = 'fiera_ligas'; // TODO: quitar en cuanto ExplorarLigas use GET /api/app/ligas real

/* Límite de caracteres de la descripción (Paso 1) */
const DESCRIPCION_MAX_LEN = 200;

/* Ligas de ejemplo — solo se usan si el usuario no ha creado
   ninguna liga todavía, para que Explorar ligas no arranque
   vacío. TODO: esto queda obsoleto en cuanto conectemos
   GET /api/app/ligas (tarea aparte, listarLigas() de momento
   sigue leyendo del mock local, NO del backend real). */
const LIGAS_SEED = [
  {
    id: 1,
    nombre: 'Liga Retorika Open',
    descripcion: 'Liga pública organizada por Retorika, abierta a debatientes de cualquier nivel.',
    imagen: null,
    acceso: 'publica',
    tipoCompeticion: 'academico',
    modoPregunta: 'aleatoria',
    mismaPreguntaTodasRondas: true,
    origenPregunta: 'banco',
    pregunta: '',
    temaId: null,
    rolFiera: 'juez',
    numeroDebates: 8,
    frecuencia: 'semanal',
    diaSemana: 'Jue',
    hora: '18:00',
    fechaInicio: '2026-07-20',
    maxParticipantes: '32',
    maxParticipantesCustom: null,
  },
  {
    id: 2,
    nombre: 'Liga Universitaria de Debate',
    descripcion: 'Competición entre clubes universitarios con formato de debate académico por equipos.',
    imagen: null,
    acceso: 'clubes_invitados',
    tipoCompeticion: 'academico',
    modoPregunta: 'fija',
    mismaPreguntaTodasRondas: true,
    origenPregunta: 'manual',
    pregunta: '¿Debería regularse el uso de inteligencia artificial en las aulas universitarias?',
    temaId: null,
    rolFiera: 'rival',
    numeroDebates: 6,
    frecuencia: 'quincenal',
    diaSemana: 'Mar',
    hora: '19:00',
    fechaInicio: '2026-08-04',
    maxParticipantes: '16',
    maxParticipantesCustom: null,
  },
];


/* ────────────────────────────────────────────────────────────
   4. CONTRATO CON EL BACKEND
   Confirmado por curl directo contra POST /api/app/ligas/new
   (no por Swagger, que daba 415 por un bug propio de su UI
   con multipart). Ver notas junto a cada campo.
──────────────────────────────────────────────────────────── */

const API_BASE = 'https://fiera.retorika.es';

/** Body real que espera el backend dentro del campo multipart "liga".
    OJO: nunca se manda "id" — el backend lo autogenera. */
export interface LigaRequest {
  nombre            : string;
  descripcion       : string;
  imgUrl?           : string;
  acceso            : string; // 'PUBLICA' | 'PRIVADA' | 'CLUBES_INVITADOS'
  tipo              : string; // 'ACADEMICO' | 'CAREO'
  papelFiera        : string; // 'JUEZ' | 'RIVAL'
  temaElegido?      : string | null; // pregunta manual (si no viene del banco)
  tema?             : { id: number } | null; // pregunta del banco — SIEMPRE anidado {id}, "temaId" plano NO funciona (probado)
  debatesNum        : number;
  debatesFrecuencia : string; // 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
  debatesDia        : string; // un único día, ej. 'Lun'
  debatesHora       : string; // 'HH:mm', el backend añade los segundos solo
  fechaI            : string; // 'YYYY-MM-DDTHH:mm:ss', sin milisegundos ni 'Z'
  fechaF            : string; // idem
  maxParticipantes  : number;
}

/** Shape de la respuesta — OJO: NO es igual al request.
    usuarios/equipos/debates que se envían (si se enviaran)
    vuelven como usuariosIds/equiposIds/debatesIds, y el
    objeto "tema" anidado vuelve aplanado como "temaId". */
export interface LigaResponse {
  id                : number;
  nombre            : string;
  descripcion       : string;
  imgUrl            : string;
  acceso            : string;
  tipo              : string;
  papelFiera        : string;
  temaElegido       : string | null;
  temaId            : number | null;
  debatesNum        : number;
  debatesFrecuencia : string;
  debatesDia        : string;
  debatesHora       : string;
  debatesIds        : number[];
  equiposIds        : number[];
  usuariosIds       : number[];
  fechaI            : string;
  fechaF            : string;
  maxParticipantes  : number;
  insignias         : string[] | null;
  status            : string | null;
}

/* Tablas de mapeo minúsculas (uso interno) → MAYÚSCULAS (backend).
   Confirmado por curl: no hay validación estricta de enum en el
   backend (no rechaza valores raros), pero mantenemos MAYÚSCULAS
   porque es el formato con el que ya guarda datos reales. */
const MAP_ACCESO: Record<TipoAcceso, string> = {
  publica          : 'PUBLICA',
  privada          : 'PRIVADA',
  clubes_invitados : 'CLUBES_INVITADOS',
};

const MAP_TIPO_COMPETICION: Record<TipoCompeticion, string> = {
  academico: 'ACADEMICO',
  careo    : 'CAREO',
};

const MAP_ROL_FIERA: Record<RolFiera, string> = {
  juez : 'JUEZ',
  rival: 'RIVAL',
};

const MAP_FRECUENCIA: Record<FrecuenciaLiga, string> = {
  semanal  : 'SEMANAL',
  quincenal: 'QUINCENAL',
  mensual  : 'MENSUAL',
};

/* Días → intervalo real entre debates, para calcular fechaF.
   Aproximación simple (no tiene en cuenta el día concreto de
   la semana) — mismo criterio que ya usaba el componente. */
const DIAS_POR_FRECUENCIA: Record<FrecuenciaLiga, number> = {
  semanal  : 7,
  quincenal: 14,
  mensual  : 30,
};

/* Convención propia para "sin límite" de participantes.
   PROBADO por curl: el backend NO interpreta 0 como especial,
   lo guarda literal — y si en algún punto valida cupos, un 0
   real bloquearía cualquier inscripción. Usamos un número alto
   en su lugar hasta que el backend tenga un valor dedicado. */
const SIN_LIMITE_VALOR = 9999;


/* ────────────────────────────────────────────────────────────
   5. SERVICIO
──────────────────────────────────────────────────────────── */

@Injectable({
  providedIn: 'root'
})
export class LigaService {

  private http = inject(HttpClient);

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
    this._config.set({ ...CONFIG_INICIAL });
    localStorage.removeItem(STORAGE_CONFIG_LIGA);
  }

  /* ----------------------------------------------------------
     calcularFechaFin()
     Única fuente de verdad para la fecha de fin estimada —
     la usa tanto el componente (para mostrarla en el Paso 6
     y en el Resumen) como crearLiga() (para el campo fechaF
     real que se envía al backend). Evita tener la fórmula
     duplicada en dos sitios.
  ---------------------------------------------------------- */
  calcularFechaFin(fechaInicio: string, frecuencia: FrecuenciaLiga, numeroDebates: number): Date | null {
    if (!fechaInicio) return null;
    const totalDias = DIAS_POR_FRECUENCIA[frecuencia] * (numeroDebates - 1);
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + totalDias);
    return fecha;
  }

  /* ----------------------------------------------------------
     crearLiga()
     POST real a /api/app/ligas/new. Sigue el mismo patrón
     multipart que AuthService.registrar(): campo "liga" con
     el JSON envuelto en Blob (type: application/json) +
     campo "imagen" (puede ir vacío, probado por curl).
  ---------------------------------------------------------- */
  crearLiga(): Observable<LigaResponse> {
    const config = this._config();

    const fechaFin = this.calcularFechaFin(config.fechaInicio, config.frecuencia, config.numeroDebates);

    const body: LigaRequest = {
      nombre           : config.nombre,
      descripcion      : config.descripcion,
      acceso           : MAP_ACCESO[config.acceso!],
      tipo             : MAP_TIPO_COMPETICION[config.tipoCompeticion!],
      papelFiera       : MAP_ROL_FIERA[config.rolFiera!],
      temaElegido      : config.origenPregunta === 'manual' ? config.pregunta : null,
      tema             : config.origenPregunta === 'banco' && config.temaId ? { id: config.temaId } : null,
      debatesNum       : config.numeroDebates,
      debatesFrecuencia: MAP_FRECUENCIA[config.frecuencia],
      debatesDia       : config.diaSemana ?? '',
      debatesHora      : config.hora,
      fechaI           : `${config.fechaInicio}T00:00:00`,
      fechaF           : fechaFin ? this.formatearISO(fechaFin) + 'T00:00:00' : `${config.fechaInicio}T00:00:00`,
      maxParticipantes : this.resolverMaxParticipantes(config),
    };

    const formData = new FormData();
    formData.append('liga', new Blob([JSON.stringify(body)], { type: 'application/json' }));

    if (config.imagen) {
      formData.append('imagen', this.base64ToBlob(config.imagen), 'liga.jpg');
    } else {
      formData.append('imagen', '');
    }

    return this.http.post<LigaResponse>(`${API_BASE}/api/app/ligas/new`, formData).pipe(
      map(res => {
        /* Limpiar el wizard solo cuando el backend confirma éxito */
        this.resetConfig();
        return res;
      })
    );
  }

  private resolverMaxParticipantes(config: ConfigLiga): number {
    if (config.maxParticipantes === 'sin_limite') return SIN_LIMITE_VALOR;
    if (config.maxParticipantes === 'personalizado') return config.maxParticipantesCustom ?? SIN_LIMITE_VALOR;
    return Number(config.maxParticipantes);
  }

  private formatearISO(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private base64ToBlob(base64: string): Blob {
    const [header, data] = base64.split(',');
    const mime   = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(data);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  /* ----------------------------------------------------------
     listarLigas()
     Usado por ExplorarLigas. TODO: sustituir por
     GET /api/app/ligas real (tarea aparte, pendiente).
     Sigue leyendo del mock local con semilla de ejemplo.
  ---------------------------------------------------------- */
  listarLigas(): any[] {
    const ligas = this.obtenerLigasMock();
    if (ligas.length === 0) {
      localStorage.setItem(STORAGE_LIGAS, JSON.stringify(LIGAS_SEED));
      return LIGAS_SEED;
    }
    return ligas;
  }

  private obtenerLigasMock(): any[] {
    const datos = localStorage.getItem(STORAGE_LIGAS);
    return datos ? JSON.parse(datos) : [];
  }
}
