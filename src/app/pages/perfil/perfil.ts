import {
  Component, inject, signal, computed, ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { DebateApi, ResultadoApi } from '../../core/services/debate.service';
import { DatePipe } from '@angular/common';


/* Fila de historial ya formateada para pintar en el HTML */
export interface FilaHistorial {
  debateId  : number;
  tema      : string;
  fecha     : string | null;
  dificultad: string;
  puntuacion: number | null;
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

  usuario = this.authService.usuario;

  cargandoUsuario = signal(false);

  ngOnInit(): void {
    this.cargandoUsuario.set(true);
    this.authService.refrescarUsuario().subscribe(() => {
      this.cargandoUsuario.set(false);
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

  /* ══════════════════════════════════════════
     HISTORIAL — real, desde debatesParticipados + resultados
  ══════════════════════════════════════════ */
  historial = computed<FilaHistorial[]>(() => {
    const u = this.usuario();
    const debates    = u?.debatesParticipados ?? [];
    const resultados = u?.resultados ?? [];

    return debates.map(d => {
      const resultado = resultados.find(r => r.debateId === d.id);
      return {
        debateId  : d.id,
        tema      : d.temaElegido || 'Tema sin especificar',
        fecha     : d.creadoA ?? null,
        dificultad: d.dificultad ?? 'medio',
        puntuacion: resultado?.scoreTotal ?? null,
      };
    }).reverse(); // más recientes primero, asumiendo orden de inserción del backend
  });

  totalDebates = computed(() => this.historial().length);

  /* ══════════════════════════════════════════
     ESTADÍSTICAS — reales, desde resultados
  ══════════════════════════════════════════ */
  mediaPuntos = computed(() => {
    const resultados = this.usuario()?.resultados ?? [];
    if (!resultados.length) return 0;
    const suma = resultados.reduce((acc, r) => acc + (r.scoreTotal ?? 0), 0);
    return Math.round(suma / resultados.length);
  });

  private mediaCampo(campo: keyof ResultadoApi): number {
    const resultados = this.usuario()?.resultados ?? [];
    if (!resultados.length) return 0;
    const suma = resultados.reduce((acc, r) => acc + ((r[campo] as number) ?? 0), 0);
    return Math.round(suma / resultados.length);
  }

  mediaRefutacion   = computed(() => this.mediaCampo('scoreRefutacion'));
  mediaArgumentacion= computed(() => this.mediaCampo('scoreArgumentacion'));
  mediaEvidencia    = computed(() => this.mediaCampo('scoreEvidence'));
  mediaClaridad     = computed(() => this.mediaCampo('scoreClarity'));


  get puntos()      { return this.usuario()?.puntos      ?? 0; }
  get ranking()     { return this.usuario()?.ranking     ?? '--'; }
  get experiencia() { return this.usuario()?.experiencia ?? 0; }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
