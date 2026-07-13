/* ============================================================
   Modelo de datos — Sistema de Logros

   Los logros pueden ser de un solo hito (niveles.length === 1,
   ej. "crear un club") o por tramos (niveles.length > 1,
   ej. "debatir 10/50/100 veces"). El componente de UI trata
   ambos casos con la misma estructura.
============================================================ */

export type CategoriaLogro = 'racha' | 'perfil' | 'resultados' | 'volumen' | 'comunidad';

export interface NivelLogro {
  nivel   : number;   // 1, 2, 3...
  objetivo: number;   // valor a alcanzar para desbloquear este nivel
  label   : string;   // "Bronce" / "10 debates" / "Completado"
  puntos  : number;   // recompensa al desbloquear este nivel
}

export interface LogroDefinicion {
  id         : string;           // identificador estable, usado como key de progreso
  categoria  : CategoriaLogro;
  nombre     : string;
  descripcion: string;
  icono      : string;           // clave para el switch de SVGs en la plantilla
  niveles    : NivelLogro[];
}

export interface ProgresoLogro {
  logroId          : string;
  valorActual       : number;
  nivelDesbloqueado : number;    // 0 = ningún nivel aún
  fechaUltimoNivel? : string;    // ISO — para ordenar "recientes" en la UI
}

export interface LogroConProgreso extends LogroDefinicion {
  progreso  : ProgresoLogro;
  completado: boolean;           // true si nivelDesbloqueado === niveles.length
  siguienteNivel: NivelLogro | null; // null si ya está completado
}

/* ── Catálogo de logros — de momento solo los 5 de la lista inicial ── */
export const LOGROS_DEFINICIONES: LogroDefinicion[] = [
  {
    id         : 'racha-semanal',
    categoria  : 'racha',
    nombre     : 'Racha semanal',
    descripcion: 'Debate 7 días seguidos.',
    icono      : 'racha',
    niveles    : [
      { nivel: 1, objetivo: 7, label: '7 días seguidos', puntos: 100 }
    ]
  },
  {
    id         : 'perfil-completo',
    categoria  : 'perfil',
    nombre     : 'Perfil completo',
    descripcion: 'Completa toda tu información de perfil.',
    icono      : 'perfil',
    niveles    : [
      { nivel: 1, objetivo: 1, label: 'Completado', puntos: 50 }
    ]
  },
  {
    id         : 'primera-victoria',
    categoria  : 'resultados',
    nombre     : 'Primera victoria',
    descripcion: 'Gana tu primer debate.',
    icono      : 'trofeo',
    niveles    : [
      { nivel: 1, objetivo: 1, label: 'Ganada', puntos: 75 }
    ]
  },
  {
    id         : 'debates-jugados',
    categoria  : 'volumen',
    nombre     : 'Debates jugados',
    descripcion: 'Participa en debates con FIERA.',
    icono      : 'debates',
    niveles    : [
      { nivel: 1, objetivo: 10,  label: '10 debates',  puntos: 100 },
      { nivel: 2, objetivo: 50,  label: '50 debates',  puntos: 250 },
      { nivel: 3, objetivo: 100, label: '100 debates', puntos: 500 }
    ]
  },
  {
    id         : 'fundador-comunidad',
    categoria  : 'comunidad',
    nombre     : 'Fundador de comunidad',
    descripcion: 'Crea un club o un torneo.',
    icono      : 'comunidad',
    niveles    : [
      { nivel: 1, objetivo: 1, label: 'Creado', puntos: 150 }
    ]
  }
];
