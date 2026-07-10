import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   AjustesNotificacionesPrivacidad — Combina en una sola
   página, con tabs, lo que antes eran dos secciones
   independientes del hub (Notificaciones y Privacidad).

   100% mock por ahora: cada bloque se persiste en su propia
   clave de localStorage y se aplica al vuelo.

   TODO: reemplazar por llamadas al backend cuando existan
   los endpoints correspondientes.
============================================================ */

/* ── Notificaciones ── */
export interface CategoriaNotificacion {
  id    : string;
  titulo: string;
  desc  : string;
  icono : 'debate' | 'liga' | 'club' | 'logro' | 'novedad';
}

const CATEGORIAS: CategoriaNotificacion[] = [
  { id: 'debates',   titulo: 'Debates',            desc: 'Recordatorios y resultados de tus debates.',          icono: 'debate'  },
  { id: 'ligas',     titulo: 'Ligas y torneos',    desc: 'Invitaciones y actualizaciones de tus ligas.',        icono: 'liga'    },
  { id: 'club',      titulo: 'Club',               desc: 'Actividad de tu club y nuevos miembros.',             icono: 'club'    },
  { id: 'logros',    titulo: 'Logros y ranking',   desc: 'Cuando subas de nivel o desbloquees un logro.',       icono: 'logro'   },
  { id: 'novedades', titulo: 'Novedades de FIERA', desc: 'Nuevas funcionalidades y anuncios de la plataforma.', icono: 'novedad' },
];

const STORAGE_NOTIF = 'fiera_notificaciones_prefs';
type PrefsNotif = Record<string, { app: boolean; email: boolean }>;

/* ── Privacidad ── */
export interface OpcionPrivacidad {
  id    : string;
  titulo: string;
  desc  : string;
  icono : 'ranking' | 'perfil' | 'club' | 'invitacion' | 'mensaje' | 'historial';
}

const OPCIONES: OpcionPrivacidad[] = [
  { id: 'ranking',    titulo: 'Aparecer en el ranking público',     desc: 'Tu posición y puntos serán visibles en el ranking general de FIERA.', icono: 'ranking'    },
  { id: 'perfil',     titulo: 'Perfil visible para otros usuarios', desc: 'Otros usuarios podrán ver tu perfil completo, no solo tu nombre.',    icono: 'perfil'     },
  { id: 'club',       titulo: 'Mostrar mi club',                    desc: 'Tu club aparecerá en tu perfil público.',                              icono: 'club'       },
  { id: 'invitacion', titulo: 'Permitir invitaciones a debate',     desc: 'Otros usuarios podrán invitarte a debatir directamente.',             icono: 'invitacion' },
  { id: 'mensaje',    titulo: 'Permitir mensajes directos',         desc: 'Otros usuarios podrán contactarte por mensaje privado.',              icono: 'mensaje'    },
  { id: 'historial',  titulo: 'Mostrar historial de debates',       desc: 'Tu historial de debates será visible en tu perfil público.',           icono: 'historial'  },
];

const DEFAULTS_PRIV: Record<string, boolean> = {
  ranking   : true,
  perfil    : true,
  club      : true,
  invitacion: true,
  mensaje   : false,
  historial : true,
};

const STORAGE_PRIV = 'fiera_privacidad_prefs';
type PrefsPriv = Record<string, boolean>;

@Component({
  selector       : 'app-ajustes-notificaciones-privacidad',
  standalone     : true,
  imports        : [],
  templateUrl    : './ajustes-notificaciones-privacidad.html',
  styleUrl       : './ajustes-notificaciones-privacidad.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AjustesNotificacionesPrivacidad {

  constructor(private router: Router) {}

  irAAjustes(): void {
    this.router.navigate(['/ajustes']);
  }

  /* ── Tabs ── */
  tabActiva = signal<'notificaciones' | 'privacidad'>('notificaciones');

  /* ══════════════════════════════════════════
     NOTIFICACIONES
  ══════════════════════════════════════════ */
  categorias = CATEGORIAS;

  prefsNotif = signal<PrefsNotif>(this.cargarPrefsNotif());

  private cargarPrefsNotif(): PrefsNotif {
    const datos = localStorage.getItem(STORAGE_NOTIF);
    const guardadas: PrefsNotif = datos ? JSON.parse(datos) : {};
    const completas: PrefsNotif = {};
    for (const cat of CATEGORIAS) {
      completas[cat.id] = guardadas[cat.id] ?? { app: true, email: false };
    }
    return completas;
  }

  private guardarPrefsNotif(prefs: PrefsNotif): void {
    localStorage.setItem(STORAGE_NOTIF, JSON.stringify(prefs));
  }

  toggleCanal(categoriaId: string, canal: 'app' | 'email'): void {
    this.prefsNotif.update(actual => {
      const nuevo: PrefsNotif = {
        ...actual,
        [categoriaId]: { ...actual[categoriaId], [canal]: !actual[categoriaId][canal] },
      };
      this.guardarPrefsNotif(nuevo);
      return nuevo;
    });
  }

  todoActivo(canal: 'app' | 'email'): boolean {
    return this.categorias.every(c => this.prefsNotif()[c.id][canal]);
  }

  toggleTodoCanal(canal: 'app' | 'email'): void {
    const activar = !this.todoActivo(canal);
    this.prefsNotif.update(actual => {
      const nuevo: PrefsNotif = { ...actual };
      for (const cat of this.categorias) {
        nuevo[cat.id] = { ...nuevo[cat.id], [canal]: activar };
      }
      this.guardarPrefsNotif(nuevo);
      return nuevo;
    });
  }

  /* ══════════════════════════════════════════
     PRIVACIDAD
  ══════════════════════════════════════════ */
  opciones = OPCIONES;

  prefsPriv = signal<PrefsPriv>(this.cargarPrefsPriv());

  private cargarPrefsPriv(): PrefsPriv {
    const datos = localStorage.getItem(STORAGE_PRIV);
    const guardadas: PrefsPriv = datos ? JSON.parse(datos) : {};
    const completas: PrefsPriv = {};
    for (const op of OPCIONES) {
      completas[op.id] = guardadas[op.id] ?? DEFAULTS_PRIV[op.id];
    }
    return completas;
  }

  private guardarPrefsPriv(prefs: PrefsPriv): void {
    localStorage.setItem(STORAGE_PRIV, JSON.stringify(prefs));
  }

  togglePrivacidad(opcionId: string): void {
    this.prefsPriv.update(actual => {
      const nuevo: PrefsPriv = { ...actual, [opcionId]: !actual[opcionId] };
      this.guardarPrefsPriv(nuevo);
      return nuevo;
    });
  }
}
