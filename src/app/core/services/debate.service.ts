import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { AuthService } from './auth.service';
import { RetosService } from './retos.service';

/* ============================================================
   DebateService — Gestión del estado del debate
============================================================ */

const API_BASE = 'https://fiera.retorika.es';

/* ── Interfaces de la API ── */

export interface TemaApi {
  id?      : number;
  categoria: string;
  enunciado: string;
  torneo   : string;
  año      : number;
  status?  : string;
  likes?   : number;
  origen?  : string;
  usuario? : {
    id       : number;
    nombre   : string;
    username : string;
    imgPerfil: string | null;
  } | null;
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
  modo         : 'academico' | 'careo' | 'clash' | 'pregunton';
  postura      : 'favor' | 'contra' | 'aleatoria';
  tema         : TemaDebate | null;
  personalidad : 'agresiva' | 'elegante' | 'sarcastica' | null;
  turnos       : TurnosDebate;
}

/* ----------------------------------------------------------
   ResultadoApi
   Estructura real que devuelve el backend al finalizar
   el debate. Hay UN resultado por cada usuario participante
   (preparado para debates con varios debatientes humanos).
---------------------------------------------------------- */
/* ----------------------------------------------------------
   ResultadoApi
   Corresponde al schema real "Resultado" del backend: usuario
   y debate son OBJETOS (no ids planos). Se mantienen también
   usuarioId/debateId como opcionales por compatibilidad, ya
   que en pruebas anteriores el backend devolvió ese formato
   plano — usar SIEMPRE obtenerUsuarioIdDeResultado() para leer
   el id, nunca acceder a los campos directamente.
---------------------------------------------------------- */
export interface ResultadoApi {
  id                : number | null;
  scoreTotal        : number;
  scoreRefutacion   : number;
  scoreArgumentacion: number;
  scoreEvidence     : number;
  scoreClarity      : number;
  feedback          : string;
  usuario?          : { id: number } | null;
  debate?           : { id: number } | null;
  /* @deprecated formato plano visto en respuestas anteriores */
  usuarioId?        : number;
  debateId?         : number;
}

/* @deprecated — formato antiguo simulado, se mantiene temporalmente
   por compatibilidad mientras se migra el componente de resultados */
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
  segundos: number;
  activo  : boolean;
  asignado: 'yo' | 'fiera' | 'companero';
}

export interface IntervencionRequest {
  nombre          : string;
  usuario         : { id: number } | null;
  duracion        : string;
  speaker         : string;
  postura         : string;
  mensaje         : string;
  estado          : string;
  speakerInputType: string;
}

export interface DebateRequest {
  modo             : string;
  dificultad       : string;
  status           : string;
  creadoA          : string;
  temaElegido      : string;
  posturaFiera     : string;
  codigo           : string;
  creador          : { id: number };
  usuarios         : { id: number }[];
  /* Lista de invitados de partida: incluye al creador y a
     cualquier compañero que se pretenda que se una. Se compara
     luego contra `usuarios` (quienes ya se han unido de verdad)
     para decidir si el debate puede arrancar o hay que
     reconfigurar con PUT /update/{id}. */
  usuariosInvitados: { id: number }[];
  tema             : { id: number } | null;
  fiera            : { id: number };
  intervenciones   : IntervencionRequest[];
  resultado        : null;
}

export interface RespuestaFiera {
  mensaje: string;
  audio  : any;
}

export interface ProcesarTurnoResponse {
  debateResponse: DebateApi;
  /* El backend puede devolver null en el primer turno del usuario,
     mientras FIERA todavía no ha generado su respuesta. */
  respuestaFiera: RespuestaFiera | null;
}

export interface IntervencionApi {
  id              : number;
  usuarioId       : number | null;
  nombre          : string;
  duracion        : string;
  speaker         : string;
  postura         : string;
  mensaje         : string;
  estado          : string;
  speakerInputType: string;
  mensajeError?   : string | null;
  /* Hora de inicio real del turno (ISO), la rellena el backend
     al llamar a /turnos/next. Se usa para sincronizar el timer
     entre varios dispositivos en un debate multi-usuario. */
  startedAt?      : string | null;
}

/* Usuario participante en el debate (preparado para varios) */
export interface UsuarioDebate {
  id        : number;
  nombre    : string;
  username  : string;
  imgPerfil?: string | null;
}

/* Datos mínimos para buscar/mostrar un usuario en el selector
   de "invitar compañero" — el endpoint GET /usuarios devuelve
   muchos más campos, pero solo nos interesan estos */
export interface UsuarioBusqueda {
  id       : number;
  nombre   : string;
  apellidos: string;
  username : string;
  imgPerfil: string | null;
}

/* ----------------------------------------------------------
   DebateApi
   Corresponde al schema DebateResponse del backend — es la
   estructura que llega dentro de ProcesarTurnoResponse y en
   las respuestas de /start, /turnos/next y /finish.

   Los campos de progreso (numeroDeParticipantes, debateFinalizado,
   hayTurnosEnProceso, intervencionActivaId) están siendo
   implementados en el backend — pueden llegar null mientras
   tanto. El frontend debe tratarlos como opcionales y usar un
   fallback manual cuando no vengan rellenos (ver partida-debate.ts).
---------------------------------------------------------- */
export interface DebateApi {
  id            : number;
  modo?         : string;
  dificultad?   : string;
  status?       : string;
  temaElegido?  : string;
  posturaFiera? : string | null;
  creadoA?      : string;
  codigo?       : string | null;
  enlace?       : string | null;
  preguntasFiera?: string[];
  usuarios      : UsuarioDebate[];
  intervenciones: IntervencionApi[];
  fiera         : { id: number; personalidad: string };
  resultados?   : ResultadoApi[];  /* uno por usuario, lo rellena el backend al finalizar */

  /* ── Campos de progreso (DebateResponse) — pueden venir null
     mientras el backend termina de implementarlos ── */
  numeroDeParticipantes? : number | null;
  numeroDeIntervenciones?: number | null;
  debateFinalizado?      : boolean | null;
  hayTurnosEnProceso?    : boolean | null;
  intervencionActivaId?  : number | null;
}

/* ── Constantes de almacenamiento ── */
const STORAGE_CONFIG     = 'fiera_config';
const STORAGE_RESULTADOS = 'fiera_resultados';
const STORAGE_DEBATE_ID  = 'fiera_debate_id';
const STORAGE_SUBTURNOS  = 'fiera_subturnos';
const STORAGE_DEBATE_ACT = 'fiera_debate_activo';

/* ── Mapa nombre wizard → nombre backend ── */
export const NOMBRE_MAP: Record<string, string> = {
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
  modo        : 'academico',
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
  private auth = inject(AuthService);
  private retos = inject(RetosService);

  /* ── Signals de estado ── */
  private _config       = signal<ConfigDebate>({ ...CONFIG_INICIAL });
  private _codigoSesion = signal<string | null>(null);
  private _debateId     = signal<number | null>(null);
  private _fieras       = signal<FieraApi[]>([]);
  private _subturnos    = signal<SubTurnoConfig[]>([]);
  private _debateActivo = signal<DebateApi | null>(null);
  private _resultados   = signal<ResultadoApi[]>([]);

  /* ── Señales públicas de solo lectura ── */
  config       = this._config.asReadonly();
  codigoSesion = this._codigoSesion.asReadonly();
  debateId     = this._debateId.asReadonly();
  fieras       = this._fieras.asReadonly();
  subturnos    = this._subturnos.asReadonly();
  debateActivo = this._debateActivo.asReadonly();
  resultados   = this._resultados.asReadonly();

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
    const normalizar = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const fiera = this._fieras().find(
      f => normalizar(f.personalidad) === normalizar(personalidad)
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
     getUsuarios()
     GET /api/app/usuarios — trae TODOS los usuarios (el
     endpoint no acepta filtros por query). Se usa para poder
     buscar/seleccionar al compañero real a invitar al crear un
     debate — el filtrado por nombre/username se hace en el
     frontend sobre esta lista completa.
  ---------------------------------------------------------- */
  getUsuarios() {
    return this.http.get<UsuarioBusqueda[]>(`${API_BASE}/api/app/usuarios`);
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
  /* companeroId: parámetro TEMPORAL de prueba para validar el
     flujo compi+compi VS FIERA con un segundo usuario real ya
     existente en la BD. Cuando exista la unión dinámica por
     código, este id vendrá de ahí en vez de pasarse a mano. */
  crearDebate(companeroId?: number | null) {
    const config    = this._config();
    const subturnos = this.cargarSubturnos();
    const usuarioId = this.auth.usuario()?.id ?? 4;

    /* Calcular postura del usuario (solo se usa como fallback,
       ya no determina la postura de cada intervención) */
    const posturaUsuario = config.postura === 'aleatoria'
      ? (Math.random() > 0.5 ? 'pro' : 'contra')
      : config.postura === 'favor' ? 'pro' : 'contra';

    /* Construir intervenciones desde los subturnos del wizard.
       La postura de cada fila depende del LADO del debate
       (favor/contra), no de quién la interpreta ni de la
       postura elegida por el usuario. */
    const intervenciones: IntervencionRequest[] = subturnos.map(t => ({
      nombre          : NOMBRE_MAP[t.nombre] ?? t.nombre.toLowerCase(),
      usuario         : t.asignado === 'yo' ? { id: usuarioId }
                      : t.asignado === 'companero' && companeroId ? { id: companeroId }
                      : null,
      duracion        : `00:${String(t.minutos).padStart(2, '0')}:00`,
      speaker         : t.asignado === 'fiera' ? 'fiera' : 'usuario',
      postura         : t.postura === 'favor' ? 'pro' : 'contra',
      mensaje         : '',
      estado          : 'PENDING',
      speakerInputType: 'text'
    }));

    /* posturaFiera (campo top-level) = la postura real de la
       fila que efectivamente interpreta FIERA */
    const filaFiera    = intervenciones.find(i => i.speaker === 'fiera');
    const posturaFiera = filaFiera?.postura ?? (posturaUsuario === 'pro' ? 'contra' : 'pro');

    /* Obtener fiera_id dinámicamente */
    const fieraId = config.personalidad
      ? (this.getFieraId(config.personalidad) ?? 1)
      : 1;

    const codigo = this.asegurarCodigoSesion();

    /* `usuarios` = quién se ha unido DE VERDAD al debate — al
       crearlo, solo el creador (el compañero aún no se ha unido
       realmente, aunque ya tenga turnos asignados por adelantado).
       `usuariosInvitados` = la lista completa de quién debería
       unirse. sala-espera compara ambas listas para saber quién
       falta por unirse. */
    const usuariosInvitadosBody: { id: number }[] = [{ id: usuarioId }];
    if (companeroId && intervenciones.some(i => i.usuario?.id === companeroId)) {
      usuariosInvitadosBody.push({ id: companeroId });
    }

    const body: DebateRequest = {
      modo             : config.modo,
      dificultad       : config.dificultad,
      status           : 'CREATED',
      creadoA          : new Date().toISOString(),
      temaElegido      : config.tema?.enunciado ?? '',
      posturaFiera,
      codigo,
      creador          : { id: usuarioId },
      usuarios         : [{ id: usuarioId }],
      usuariosInvitados: usuariosInvitadosBody,
      tema             : config.tema?.id ? { id: config.tema.id } : null,
      fiera            : { id: fieraId },
      intervenciones,
      resultado        : null
    };

    return this.http.post<DebateApi>(`${API_BASE}/api/app/debates/new-debate`, body);
  }

  /* ----------------------------------------------------------
     getCodigoSesion()
     Solo LEE el código de sesión ya generado (o null si aún
     no existe). Segura de usar directamente en un getter del
     componente que se evalúa durante el renderizado de la
     plantilla — nunca escribe en la señal.
  ---------------------------------------------------------- */
  getCodigoSesion(): string | null {
    return this._codigoSesion();
  }

  /* ----------------------------------------------------------
     asegurarCodigoSesion()
     Genera el código de invitación UNA sola vez por sesión de
     wizard (si no existe ya) y lo guarda. IMPORTANTE: llamar
     SIEMPRE desde fuera del renderizado de la plantilla —
     ngOnInit(), constructor, un manejador de evento, etc.
     Llamarla desde un getter usado en el HTML provoca el error
     de Angular "NG0600: Writing to signals is not allowed
     while Angular renders the template".
  ---------------------------------------------------------- */
  asegurarCodigoSesion(): string {
    const actual = this._codigoSesion();
    if (actual) return actual;
    const nuevo = this.generarCodigo('DBT');
    this._codigoSesion.set(nuevo);
    return nuevo;
  }

  /* Limpia el código de sesión — llamar al empezar un wizard
     nuevo (p. ej. junto a resetConfig()) para que el siguiente
     debate genere un código distinto */
  resetCodigoSesion(): void {
    this._codigoSesion.set(null);
  }

  /* ----------------------------------------------------------
     generarCodigo()
     Código único con prefijo por tipo de entidad, para poder
     distinguir a simple vista debates ('DBT'), ligas ('LIG'),
     clubs ('CLB'), etc. cuando se implementen sus propios
     códigos de invitación. 8 caracteres alfanuméricos en
     mayúsculas, excluyendo 0/O/1/I para evitar confusión visual.
  ---------------------------------------------------------- */
  private generarCodigo(prefijo: string, longitud: number = 8): string {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < longitud; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return `${prefijo}-${codigo}`;
  }

  /* ----------------------------------------------------------
     unirseDebatePorCodigo()
     POST /join/codigo-{codigo}-{userId}
     Devuelve el DebateApi completo si el código existe, o
     lanza error (404 con message: "No existe un debate con
     ese código.") que el componente debe capturar y mostrar.
  ---------------------------------------------------------- */
  unirseDebatePorCodigo(codigo: string, userId?: number) {
    const id = userId ?? this.auth.usuario()?.id ?? 4;
    return this.http.post<DebateApi>(
      `${API_BASE}/api/app/debates/join/codigo-${codigo}-${id}`,
      {}
    ).pipe(
      tap(debate => {
        if (debate) this.setDebateActivo(debate);
      })
    );
  }

  /* ----------------------------------------------------------
     unirseDebatePorEnlace()
     POST /join/enlace-{enlace}-{userId}
  ---------------------------------------------------------- */
  unirseDebatePorEnlace(enlace: string, userId?: number) {
    const id = userId ?? this.auth.usuario()?.id ?? 4;
    return this.http.post<DebateApi>(
      `${API_BASE}/api/app/debates/join/enlace-${enlace}-${id}`,
      {}
    ).pipe(
      tap(debate => {
        if (debate) this.setDebateActivo(debate);
      })
    );
  }

  /* Construye el enlace de invitación (URL de la propia app)
     a partir del código del debate */
  construirEnlaceDebate(codigo: string): string {
    return `${window.location.origin}${window.location.pathname}#/unirse-debate/${codigo}`;
  }

  /* ----------------------------------------------------------
     obtenerDebateCompleto()
     GET /api/app/debates/{id} — trae el objeto Debate COMPLETO
     (el schema pesado, con usuarios anidados enteros, ligas,
     clash, etc.) — distinto del DebateApi/DebateResponse ligero
     que usa el resto del servicio. Es necesario como paso
     previo a actualizarDebate(), ya que PUT /update/{id} exige
     mandar el objeto entero, no un parcial.

     Se tipa como `any` a propósito: el schema completo es muy
     profundo y no aporta modelarlo entero en TypeScript solo
     para hacer de intermediario en un round-trip GET→PUT.
  ---------------------------------------------------------- */
  obtenerDebateCompleto(debateId: number) {
    return this.http.get<any>(`${API_BASE}/api/app/debates/${debateId}`);
  }

  /* ----------------------------------------------------------
     obtenerResultadosPorUsuario()
     GET /api/app/resultados/user-{id} — trae TODOS los
     resultados de un usuario con el debateId correctamente
     enlazado (a diferencia de usuario.resultados, que venía
     con debateId=null por un bug de serialización).
  ---------------------------------------------------------- */
  obtenerResultadosPorUsuario(usuarioId: number) {
    return this.http.get<ResultadoApi[]>(`${API_BASE}/api/app/resultados/user-${usuarioId}`);
  }

  /* ----------------------------------------------------------
     actualizarDebate()
     PUT /api/app/debates/update/{id} — exige el objeto Debate
     COMPLETO (no parcial). Se le pasa el objeto ya modificado,
     normalmente obtenido antes con obtenerDebateCompleto() y
     mutado con reconfigurarConUnidos() o a mano.
  ---------------------------------------------------------- */
  actualizarDebate(debateId: number, debateCompleto: any) {
    return this.http.put<any>(
      `${API_BASE}/api/app/debates/update/${debateId}`,
      debateCompleto
    );
  }

  /* ----------------------------------------------------------
     invitadosPendientes()
     Compara usuariosInvitados vs usuarios de un debate
     completo. Devuelve los ids de los invitados que TODAVÍA
     no se han unido.
  ---------------------------------------------------------- */
  invitadosPendientes(debateCompleto: any): number[] {
    const invitadosIds = (debateCompleto?.usuariosInvitados ?? []).map((u: any) => u.id);
    const unidosIds     = (debateCompleto?.usuarios ?? []).map((u: any) => u.id);
    return invitadosIds.filter((id: number) => !unidosIds.includes(id));
  }

  /* ----------------------------------------------------------
     reconfigurarConUnidos()
     Construye (sin mandar todavía) el objeto Debate listo para
     el PUT que reconfigura el debate dejando en
     usuariosInvitados SOLO a quienes sí se han unido a tiempo.

     ⚠️ Pendiente de decidir con el equipo qué hacer con las
     intervenciones que estaban asignadas a un invitado que
     nunca llegó a unirse (¿se las queda el creador? ¿pasan a
     FIERA? ¿el debate simplemente no puede reconfigurarse y
     hay que crearlo de cero?) — de momento esta función SOLO
     ajusta usuariosInvitados, no toca intervenciones.
  ---------------------------------------------------------- */
  reconfigurarConUnidos(debateCompleto: any): any {
    const unidosIds = (debateCompleto.usuarios ?? []).map((u: any) => u.id);
    return {
      ...debateCompleto,
      usuariosInvitados: (debateCompleto.usuariosInvitados ?? [])
        .filter((u: any) => unidosIds.includes(u.id)),
    };
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
     iniciarDebate()
     POST /{debateId}/start — obligatorio antes de mandar
     cualquier turno. Cambia el debate a EN_PROGRESO.
     Sin esta llamada, procesarTurno() falla con:
     "IllegalStateException: El debate no está en progreso."
  ---------------------------------------------------------- */
  iniciarDebate(debateId: number) {
    return this.http.post<DebateApi>(
      `${API_BASE}/api/app/debates/${debateId}/start`,
      {}
    ).pipe(
      tap(debate => {
        if (debate) this.setDebateActivo(debate);
      })
    );
  }

  /* ----------------------------------------------------------
     avanzarTurno()
     POST /{debateId}/turnos/next — hay que llamarlo después
     de procesar cada intervención (procesarTurno) para que
     el backend avance al siguiente turno de la secuencia.
  ---------------------------------------------------------- */
  avanzarTurno(debateId: number) {
    return this.http.post<DebateApi>(
      `${API_BASE}/api/app/debates/${debateId}/turnos/next`,
      {}
    ).pipe(
      tap(debate => {
        if (debate) this.setDebateActivo(debate);
      })
    );
  }

  /* ----------------------------------------------------------
     finalizarDebateBackend()
     POST /{debateId}/finish — cierra el debate en el backend
     y dispara el cálculo de resultados. Sin esta llamada el
     debate se queda colgado y nunca pasa a FINALIZADO.
  ---------------------------------------------------------- */
  finalizarDebateBackend(debateId: number) {
    return this.http.post<DebateApi>(
      `${API_BASE}/api/app/debates/${debateId}/finish`,
      {}
    ).pipe(
      tap(debate => {
        if (debate) this.setDebateActivo(debate);
      })
    );
  }

  /* ----------------------------------------------------------
     setDebateActivo() / getDebateActivo()
     Guarda el debate completo con intervenciones y sus ids
     para poder referenciarlos durante la partida.
     Si el backend incluye `resultados`, también se cachean.
  ---------------------------------------------------------- */
  setDebateActivo(debate: DebateApi): void {
    this._debateActivo.set(debate);
    localStorage.setItem(STORAGE_DEBATE_ACT, JSON.stringify(debate));

    console.log('🔵 setDebateActivo — resultados recibidos:', debate.resultados);

    if (debate.resultados?.length) {
      this.guardarResultadosApi(debate.resultados);
    }
  }

  getDebateActivo(): DebateApi | null {
    if (this._debateActivo()) return this._debateActivo();
    const stored = localStorage.getItem(STORAGE_DEBATE_ACT);
    return stored ? JSON.parse(stored) : null;
  }

  /* ----------------------------------------------------------
     procesarTurno()
     Envía el texto/audio del usuario al backend y recibe
     la respuesta de FIERA. Si es el último turno, el backend
     incluye los resultados finales dentro de debateResponse.
  ---------------------------------------------------------- */
  procesarTurno(debateId: number, turnId: number, texto: string, audio?: Blob | null) {
    const formData = new FormData();

    if (audio) {
      const extension = audio.type.includes('webm') ? 'webm'
                  : audio.type.includes('mp4')  ? 'mp4'
                  : audio.type.includes('mpeg')  ? 'mp3'
                  : 'webm';
      formData.append('file', audio, `intervencion.${extension}`);
    } else if (texto.trim()) {
      formData.append('text', texto);
    }

    return this.http.post<ProcesarTurnoResponse>(
      `${API_BASE}/api/app/debates/${debateId}/turnos/${turnId}`,
      formData
    ).pipe(
      tap(res => {
        if (res?.debateResponse) {
          this.setDebateActivo(res.debateResponse);
        }
      })
    );
  }

  /* ----------------------------------------------------------
     reproducirAudioFiera()
  ---------------------------------------------------------- */
  reproducirAudioFiera(base64: string): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const binary  = atob(base64);
        const bytes   = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url  = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.onloadedmetadata = () => resolve(audio.duration);
        audio.onended          = () => URL.revokeObjectURL(url);
        audio.onerror          = () => reject(new Error('Error al reproducir audio'));

        audio.play().catch(reject);
      } catch (e) {
        reject(e);
      }
    });
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
    this.resetCodigoSesion();
  }

  /* ----------------------------------------------------------
     guardarResultadosApi() / obtenerResultadosApi()
     Persiste el array de ResultadoApi que devuelve el backend
     (uno por cada usuario participante en el debate).
  ---------------------------------------------------------- */
  guardarResultadosApi(resultados: ResultadoApi[]): void {
    this._resultados.set(resultados);
    localStorage.setItem(STORAGE_RESULTADOS, JSON.stringify(resultados));
  }

  obtenerResultadosApi(): ResultadoApi[] {
    if (this._resultados().length) return this._resultados();
    const datos = localStorage.getItem(STORAGE_RESULTADOS);
    if (datos) {
      const lista = JSON.parse(datos) as ResultadoApi[];
      this._resultados.set(lista);
      return lista;
    }
    return [];
  }

  /* Extrae el usuarioId de un ResultadoApi sea cual sea el
     formato en que llegue (objeto usuario{id} o plano usuarioId) */
  private obtenerUsuarioIdDeResultado(r: ResultadoApi): number | undefined {
    return r.usuario?.id ?? r.usuarioId;
  }

  /* Devuelve el resultado del usuario actual. Si no se pasa
     usuarioId explícito, usa el del usuario logueado. */
  obtenerResultadoUsuario(usuarioId?: number): ResultadoApi | null {
    const lista = this.obtenerResultadosApi();
    if (!lista.length) return null;
    const id = usuarioId ?? this.auth.usuario()?.id;
    if (id != null) {
      return lista.find(r => this.obtenerUsuarioIdDeResultado(r) === id) ?? lista[0];
    }
    return lista[0];
  }

  /* ----------------------------------------------------------
     @deprecated guardarResultados() / obtenerResultados()
     Formato antiguo simulado — se mantiene temporalmente
     hasta migrar el componente de resultados al formato real.
  ---------------------------------------------------------- */
  guardarResultados(resultados: Resultados): void {
    localStorage.setItem('fiera_resultados_legacy', JSON.stringify(resultados));
  }

  obtenerResultados(): Resultados | null {
    const datos = localStorage.getItem('fiera_resultados_legacy');
    return datos ? JSON.parse(datos) : null;
  }

  /* ── Reto del día — Careo. Delega el hash de fecha en RetosService,
     compartido con Preguntón (y Clash cuando toque) ── */

  /** Tema del Careo — mismo para todos, cambia cada 24h */
  getTemaDelDia(temas: TemaApi[]): TemaApi | null {
    return this.retos.elegirDelDia(temas);
  }

  /** Duración por turno del Careo — 60 o 120 segundos, cambia cada 24h */
  getTiempoPorTurnoDelDia(): 60 | 120 {
    return this.retos.seedDelDia() % 2 === 0 ? 60 : 120;
  }
}
