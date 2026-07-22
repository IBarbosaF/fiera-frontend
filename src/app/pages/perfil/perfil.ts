import {
  Component, inject, signal, computed, ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { DebateApi, ResultadoApi, DebateService } from '../../core/services/debate.service';
import { RankingService } from '../../core/services/ranking.service';

/* Fila de historial ya formateada para pintar en el HTML */
export interface FilaHistorial {
  debateId  : number;
  tema      : string;
  fecha     : string | null;
  dificultad: string;
  modo      : string;
  postura   : string | null;
  puntuacion: number | null;
  finalizado: boolean;
}

@Component({
  selector       : 'app-perfil',
  standalone     : true,
  imports        : [DatePipe],
  templateUrl    : './perfil.html',
  styleUrl       : './perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil implements OnInit {

  private router      = inject(Router);
  private authService = inject(AuthService);
  private debateService = inject(DebateService);
  private rankingService = inject(RankingService);

  usuario = this.authService.usuario;

  cargandoUsuario = signal(false);
  resultadosReales = signal<ResultadoApi[]>([]);

  ngOnInit(): void {
    this.cargandoUsuario.set(true);
    this.authService.refrescarUsuario().subscribe(() => {
      this.cargandoUsuario.set(false);
      this.cargarResultados();
      console.log('🟣 debatesParticipados:', JSON.stringify(this.usuario()?.debatesParticipados, null, 2));
    });
  }

  private cargarResultados(): void {
    const id = this.usuario()?.id;
    if (!id) return;

    this.debateService.obtenerResultadosPorUsuario(id).subscribe({
      next : resultados => this.resultadosReales.set(resultados ?? []),
      error: () => this.resultadosReales.set([]),
    });
  }

  /* ── Avatar ── */
  iniciales = computed(() => {
    const u = this.usuario();
    if (!u) return '?';
    return (u.nombre[0] + (u.apellidos?.[0] ?? '')).toUpperCase();
  });

  private readonly UPLOADS_BASE = 'https://fiera.retorika.es/uploads';

  tieneImagen = computed(() => !!this.usuario()?.imgPerfil);

  urlImagenPerfil = computed(() => {
    const nombreArchivo = this.usuario()?.imgPerfil;
    if (!nombreArchivo) return null;
    return `${this.UPLOADS_BASE}/${nombreArchivo}`;
  });

  nivelLabel = computed(() => this.usuario()?.nivel ?? 'Sin nivel');

  subLabel = computed(() => {
    const sub = this.usuario()?.subscripcion;
    if (!sub) return 'Gratuita';
    return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
  });

  subClase = computed(() => {
    const sub = (this.usuario()?.subscripcion ?? '').toLowerCase();
    if (sub.includes('pro') || sub.includes('premium')) return 'sub--pro';
    if (sub.includes('club'))                            return 'sub--club';
    return 'sub--free';
  });

  /* ══════════════════════════════════════════
     CV — sigue local, no hay endpoint confirmado
  ══════════════════════════════════════════ */
  cvNombre = signal<string | null>(null);
  cvError  = signal('');

  subirCv(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.cvError.set('Solo se admiten archivos PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.cvError.set('El archivo no puede superar los 5 MB.');
      return;
    }
    this.cvNombre.set(file.name);
    this.cvError.set('');
  }

  eliminarCv(): void { this.cvNombre.set(null); }


  /* Busca la postura que defendió ESTE usuario (no la Fiera ni
     otros participantes) en un debate, mirando su primera
     intervención con mensaje real */
  private obtenerPosturaUsuario(debate: DebateApi, usuarioId: number): string | null {
    const intervenciones = (debate as any).intervenciones ?? [];
    const propia = intervenciones.find(
      (i: any) => i.speaker === 'usuario' && i.usuarioId === usuarioId
    );
    return propia?.postura ?? null;
  }

  /* Traduce el valor crudo de 'modo' a una etiqueta legible */
  private etiquetaModo(modo: string): string {
    const mapa: Record<string, string> = {
      academico: 'Debate académico',
      careo    : 'Careo',
      clash    : 'Clash',
      pregunton: 'Preguntón',
      completo : 'Debate académico', // valores antiguos, antes del fix
      express  : 'Careo',
    };
    return mapa[modo.toLowerCase()] ?? modo;
  }
  /* ══════════════════════════════════════════
     HISTORIAL — versión rápida (sin peticiones extra)

     LIMITACIÓN CONOCIDA: usuario().resultados llega con
     debateId=null desde GET /api/app/usuarios (bug de
     serialización en backend — reportado a María Rosa).
     Por eso 'puntuacion' saldrá null en casi todos los casos
     hasta que el backend lo arregle, o hasta que exista un
     endpoint agregado de resultados que traiga todo enlazado
     correctamente (ver TODO más abajo).
  ══════════════════════════════════════════ */

  historial = computed<FilaHistorial[]>(() => {
    const u = this.usuario();
    const debates    = u?.debatesParticipados ?? [];
    const resultados = this.resultadosReales();

    const filas = debates.map(d => {
      const resultado = resultados.find(r => (r.debate?.id ?? r.debateId) === d.id);
      return {
        debateId  : d.id,
        tema      : d.temaElegido || 'Tema sin especificar',
        fecha     : d.creadoA ?? null,
        dificultad: d.dificultad ?? 'medio',
        modo      : this.etiquetaModo(d.modo ?? 'academico'),
        postura   : u?.id ? this.obtenerPosturaUsuario(d, u.id) : null,
        puntuacion: resultado?.scoreTotal ?? null,
        finalizado: d.status === 'FINISHED',
      };
    });

    // TODO: ordenar por 'fecha' real en cuanto el backend incluya
    // 'creadoA' en la respuesta de debatesParticipados (reportado
    // a María Rosa). Mientras tanto, usamos 'debateId' descendente
    // como aproximación razonable, asumiendo ids autoincrementales.
    return filas.sort((a, b) => b.debateId - a.debateId);
  });

  totalDebates = computed(() => this.historial().length);

  // TODO: cuando María Rosa tenga listo el endpoint agregado de
  // resultados (GET /api/app/resultados o similar, con debate y
  // usuario ya enlazados correctamente, incluyendo retos como
  // careo/clash/pregunton y victorias de ligas), sustituir el
  // 'historial' de arriba por una llamada real a ese endpoint,
  // eliminando la dependencia de usuario().resultados/debatesParticipados
  // y este parche de matching manual.

  /* ══════════════════════════════════════════
     ESTADÍSTICAS — reales, desde resultados
     (no dependen de saber a qué debate pertenece cada uno,
     así que esta parte SÍ funciona bien ya mismo)
  ══════════════════════════════════════════ */
  mediaPuntos = computed(() => {
    const resultados = this.resultadosReales();
    if (!resultados.length) return 0;
    const suma = resultados.reduce((acc, r) => acc + (r.scoreTotal ?? 0), 0);
    return Math.round(suma / resultados.length);
  });

  private mediaCampo(campo: keyof ResultadoApi): number {
    const resultados = this.resultadosReales();
    if (!resultados.length) return 0;
    const suma = resultados.reduce((acc, r) => acc + ((r[campo] as number) ?? 0), 0);
    return Math.round(suma / resultados.length);
  }

  mediaRefutacion    = computed(() => this.mediaCampo('scoreRefutacion'));
  mediaArgumentacion = computed(() => this.mediaCampo('scoreArgumentacion'));
  mediaEvidencia     = computed(() => this.mediaCampo('scoreEvidence'));
  mediaClaridad      = computed(() => this.mediaCampo('scoreClarity'));

  // TODO: cuando exista el endpoint agregado, aquí también se
  // podrían añadir stats reales de retos (careo/clash/pregunton
  // completados) y victorias en ligas, sustituyendo la card
  // "Logros" vacía por datos de verdad.

  get puntos()      { return this.usuario()?.puntos      ?? 0; }
  get experiencia() { return this.usuario()?.experiencia ?? 0; }
  ranking = computed(() => this.rankingService.miPosicionGeneral()?.posicion ?? '--');

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
