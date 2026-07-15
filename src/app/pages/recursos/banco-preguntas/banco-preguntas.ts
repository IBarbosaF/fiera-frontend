import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { HttpClient }   from '@angular/common/http';

/* ============================================================
   BancoPreguntas — Repositorio de preguntas de debate
   Datos reales de GET /api/app/temas
   Likes persistidos en localStorage
   TODO: endpoint para preguntas de comunidad
   TODO: roles/validación de superadmin
   TODO: sistema de notificaciones
   TODO: puntos y logros
============================================================ */

export type TabPreguntas = 'oficiales' | 'comunidad' | 'coleccion';

export interface TemaApi {
  id       : number;
  categoria: string;
  enunciado: string;
  torneo   : string;
  año      : number;
  status   : string;
  likes    : number;
  origen   : string;
  usuario  : any;
}

export interface PreguntaOficial {
  id        : string;
  pregunta  : string;
  torneo    : string;
  club      : string;
  anio      : number;
  tematica  : string;
  likes     : number;
  likedPorMi: boolean;
}

export interface PreguntaComunidad {
  id        : string;
  pregunta  : string;
  usuario   : string;
  avatar    : string;
  anio      : number;
  tematica  : string;
  likes     : number;
  likedPorMi: boolean;
}

const API_BASE   = 'https://fiera.retorika.es';
const POR_PAGINA = 6;

@Component({
  selector        : 'app-banco-preguntas',
  standalone      : true,
  imports         : [CommonModule, FormsModule],
  templateUrl     : './banco-preguntas.html',
  styleUrl        : './banco-preguntas.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class BancoPreguntas implements OnInit {

  private http = inject(HttpClient);
  private cdr  = inject(ChangeDetectorRef);

  private readonly STORAGE_LIKES_OFICIALES = 'fiera_likes_preguntas_oficiales';
  private readonly STORAGE_LIKES_COMUNIDAD = 'fiera_likes_preguntas_comunidad';

  /* ── Estado ── */
  tab            = signal<TabPreguntas>('oficiales');
  busqueda       = signal('');
  anioFiltro     = signal<number | null>(null);
  tematicaFiltro = signal<string | null>(null);
  paginaActual   = signal(1);
  cargando       = signal(false);
  errorCarga     = signal(false);

  modalNuevaAbierto     = signal(false);
  modalCompartirAbierto = signal(false);
  preguntaCompartir     = signal<string>('');

  /* ── Data ── */
  oficiales = signal<PreguntaOficial[]>([]);
  comunidad = signal<PreguntaComunidad[]>([]);

  /* ── Stats ── */
  totalPreguntas = computed(() =>
    this.oficiales().length + this.comunidad().length
  );

  totalTorneos = computed(() =>
    new Set(this.oficiales().map(p => p.torneo)).size
  );

  aniosHistorial = computed(() => {
    const todos = [
      ...this.oficiales().map(p => p.anio),
      ...this.comunidad().map(p => p.anio)
    ];
    if (!todos.length) return 0;
    return Math.max(...todos) - Math.min(...todos) + 1;
  });

  /* ── Colección ── */
  totalColeccion = computed(() =>
    this.oficiales().filter(p => p.likedPorMi).length +
    this.comunidad().filter(p => p.likedPorMi).length
  );

  /* ── Temáticas disponibles ── */
  tematicas = computed<string[]>(() => {
    const lista = this.tab() === 'oficiales' ? this.oficiales()
                : this.tab() === 'comunidad' ? this.comunidad()
                : [
                    ...this.oficiales().filter(p => p.likedPorMi),
                    ...this.comunidad().filter(p => p.likedPorMi)
                  ];
    return [...new Set(lista.map(p => p.tematica))].sort();
  });

  /* ── Años disponibles ── */
  anios = computed<number[]>(() => {
    const lista = this.tab() === 'oficiales' ? this.oficiales()
                : this.tab() === 'comunidad' ? this.comunidad()
                : [
                    ...this.oficiales().filter(p => p.likedPorMi),
                    ...this.comunidad().filter(p => p.likedPorMi)
                  ];
    return [...new Set(lista.map(p => p.anio))].sort((a, b) => b - a);
  });

  /* ── Preguntas filtradas ── */
  preguntasFiltradas = computed<(PreguntaOficial | PreguntaComunidad)[]>(() => {
    const q        = this.busqueda().toLowerCase().trim();
    const anio     = this.anioFiltro();
    const tematica = this.tematicaFiltro();

    let lista: (PreguntaOficial | PreguntaComunidad)[];

    if (this.tab() === 'oficiales') {
      lista = this.oficiales();
    } else if (this.tab() === 'comunidad') {
      lista = this.comunidad();
    } else {
      lista = [
        ...this.oficiales().filter(p => p.likedPorMi),
        ...this.comunidad().filter(p => p.likedPorMi),
      ];
    }

    return lista.filter(p => {
      if (anio && p.anio !== anio)             return false;
      if (tematica && p.tematica !== tematica) return false;
      if (q && !p.pregunta.toLowerCase().includes(q)
            && !this.origenTexto(p).toLowerCase().includes(q)) return false;
      return true;
    });
  });

  /* ── Paginación ── */
  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.preguntasFiltradas().length / POR_PAGINA))
  );

  preguntasPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * POR_PAGINA;
    return this.preguntasFiltradas().slice(inicio, inicio + POR_PAGINA);
  });

  paginasVisibles = computed<(number | '...')[]>(() => {
    const total  = this.totalPaginas();
    const actual = this.paginaActual();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const paginas: (number | '...')[] = [1];
    if (actual > 3) paginas.push('...');
    for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) {
      paginas.push(i);
    }
    if (actual < total - 2) paginas.push('...');
    paginas.push(total);
    return paginas;
  });

  /* ── Carga inicial ── */
  ngOnInit(): void {
    this.cargarPreguntas();
  }

  cargarPreguntas(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.http.get<any>(`${API_BASE}/api/app/temas`).subscribe({
      next: (res) => {
        const temas: TemaApi[] = Array.isArray(res) ? res : (res?.data ?? []);

        const likesOficiales = this.cargarLikesStorage(this.STORAGE_LIKES_OFICIALES);
        const likesComunidad = this.cargarLikesStorage(this.STORAGE_LIKES_COMUNIDAD);

        const oficiales: PreguntaOficial[] = temas
          .filter(t => t.origen !== 'COMUNIDAD')
          .map(t => ({
            id        : String(t.id),
            pregunta  : t.enunciado,
            torneo    : t.torneo ?? '-',
            club      : '-',
            anio      : t.año,
            tematica  : t.categoria,
            likes     : t.likes ?? 0,
            likedPorMi: likesOficiales.has(String(t.id)),
          }));

        const comunidad: PreguntaComunidad[] = temas
          .filter(t => t.origen === 'COMUNIDAD')
          .map(t => ({
            id        : String(t.id),
            pregunta  : t.enunciado,
            usuario   : t.usuario?.username ? `@${t.usuario.username}` : '@usuario',
            avatar    : t.usuario?.imgPerfil ?? `https://i.pravatar.cc/80?u=${t.id}`,
            anio      : t.año,
            tematica  : t.categoria,
            likes     : t.likes ?? 0,
            likedPorMi: likesComunidad.has(String(t.id)),
          }));

        this.oficiales.set(oficiales);
        this.comunidad.set(comunidad);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('🔴 Error cargando preguntas:', err);
        this.errorCarga.set(true);
        this.cargando.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  /* ── localStorage likes ── */
  private cargarLikesStorage(key: string): Set<string> {
    const datos = localStorage.getItem(key);
    return datos ? new Set(JSON.parse(datos)) : new Set();
  }

  /* ── Helpers de tipo ── */
  esOficial(p: PreguntaOficial | PreguntaComunidad): p is PreguntaOficial {
    return 'torneo' in p;
  }

  origenTexto(p: PreguntaOficial | PreguntaComunidad): string {
    return this.esOficial(p) ? `${p.torneo} ${p.club}` : p.usuario;
  }

  /* ── Tab ── */
  setTab(t: TabPreguntas): void {
    this.tab.set(t);
    this.paginaActual.set(1);
    this.anioFiltro.set(null);
    this.tematicaFiltro.set(null);
  }

  /* ── Filtros ── */
  setAnio(valor: string): void {
    this.anioFiltro.set(valor ? +valor : null);
    this.paginaActual.set(1);
  }

  setTematica(valor: string): void {
    this.tematicaFiltro.set(valor || null);
    this.paginaActual.set(1);
  }

  onBuscar(valor: string): void {
    this.busqueda.set(valor);
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.anioFiltro.set(null);
    this.tematicaFiltro.set(null);
    this.paginaActual.set(1);
  }

  /* ── Paginación ── */
  irAPagina(p: number | '...'): void {
    if (p === '...') return;
    this.paginaActual.set(p);
  }

  anterior(): void {
    if (this.paginaActual() > 1) this.paginaActual.update(p => p - 1);
  }

  siguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) this.paginaActual.update(p => p + 1);
  }

  /* ── Like ── */
  toggleLike(p: PreguntaOficial | PreguntaComunidad, e: MouseEvent): void {
    e.stopPropagation();
    const nuevoEstado = !p.likedPorMi;

    if (this.esOficial(p)) {
      this.oficiales.update(lista => lista.map(item =>
        item.id === p.id
          ? { ...item, likedPorMi: nuevoEstado }
          : item
      ));
      const set = new Set(this.oficiales().filter(i => i.likedPorMi).map(i => i.id));
      localStorage.setItem(this.STORAGE_LIKES_OFICIALES, JSON.stringify([...set]));
    } else {
      this.comunidad.update(lista => lista.map(item =>
        item.id === p.id
          ? { ...item, likedPorMi: nuevoEstado }
          : item
      ));
      const set = new Set(this.comunidad().filter(i => i.likedPorMi).map(i => i.id));
      localStorage.setItem(this.STORAGE_LIKES_COMUNIDAD, JSON.stringify([...set]));
    }
  }

  /* ── Modal pregunta nueva ── */
  abrirModalNueva(): void  { this.modalNuevaAbierto.set(true);  }
  cerrarModalNueva(): void { this.modalNuevaAbierto.set(false); }

  cerrarModalNuevaFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalNueva();
    }
  }

  /* ── Modal compartir ── */
  abrirCompartir(pregunta: string, e: MouseEvent): void {
    e.stopPropagation();
    this.preguntaCompartir.set(pregunta);
    this.modalCompartirAbierto.set(true);
  }

  cerrarCompartir(): void { this.modalCompartirAbierto.set(false); }

  cerrarCompartirFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarCompartir();
    }
  }

  compartirEn(canal: string): void {
    const texto = encodeURIComponent(`"${this.preguntaCompartir()}" — vía FIERA`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${texto}`,
      telegram: `https://t.me/share/url?text=${texto}`,
      gmail   : `https://mail.google.com/mail/?view=cm&su=Pregunta%20de%20debate&body=${texto}`,
      outlook : `https://outlook.live.com/mail/0/deeplink/compose?body=${texto}`,
    };
    if (urls[canal]) window.open(urls[canal], '_blank');
    this.cerrarCompartir();
  }
}
