import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';

/* ============================================================
   BancoPreguntas — Repositorio de preguntas de debate

   Tres tabs: Oficiales (de torneos), Comunidad (creadas por usuarios) y Colección (preguntas favoritas)
   TODO: conectar con backend cuando haya endpoints
   TODO: roles/validación de superadmin — fuera de alcance por ahora
   TODO: sistema de notificaciones — fuera de alcance por ahora
   TODO: puntos y logros — fuera de alcance por ahora
============================================================ */

export type TabPreguntas = 'oficiales' | 'comunidad' | 'coleccion';

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

/* ── Mockdata: preguntas oficiales ── */
// TODO: reemplazar con llamada al backend (/api/app/preguntas?origen=oficial)
const MOCK_OFICIALES: PreguntaOficial[] = [
  {
    id: '1', pregunta: '¿Deberían los gobiernos prohibir el uso de la inteligencia artificial?',
    torneo: 'Campeonato Mundial Escolar', club: 'Federación Mundial de Debate', anio: 2024,
    tematica: 'Tecnología', likes: 142, likedPorMi: false,
  },
  {
    id: '2', pregunta: '¿Es el crecimiento económico más importante que la sostenibilidad?',
    torneo: 'World Universities Debating Championship', club: 'WUDC', anio: 2023,
    tematica: 'Economía', likes: 98, likedPorMi: false,
  },
  {
    id: '3', pregunta: '¿Debería el voto ser obligatorio en las democracias?',
    torneo: 'Campeonato Nacional de Debate', club: 'Asociación Española de Debate', anio: 2022,
    tematica: 'Política', likes: 76, likedPorMi: false,
  },
  {
    id: '4', pregunta: '¿Debería limitarse el uso de redes sociales en menores de edad?',
    torneo: 'Liga Retorika Madrid', club: 'Retorika', anio: 2024,
    tematica: 'Sociedad', likes: 64, likedPorMi: false,
  },
  {
    id: '5', pregunta: '¿Es ética la experimentación con animales en la investigación científica?',
    torneo: 'Copa Hispana de Debate', club: 'Club Debate Universidad de Sevilla', anio: 2023,
    tematica: 'Ética', likes: 51, likedPorMi: false,
  },
  {
    id: '6', pregunta: '¿Debería existir una renta básica universal?',
    torneo: 'Torneo Nacional Karl Popper', club: 'Asociación Española de Debate', anio: 2022,
    tematica: 'Economía', likes: 88, likedPorMi: false,
  },
];

/* ── Mockdata: preguntas comunidad ── */
// TODO: reemplazar con llamada al backend (/api/app/preguntas?origen=comunidad)
const MOCK_COMUNIDAD: PreguntaComunidad[] = [
  {
    id: 'c1', pregunta: '¿Las redes sociales hacen más daño que beneficio a la sociedad?',
    usuario: '@DebatientePro', avatar: 'https://i.pravatar.cc/80?img=12', anio: 2024,
    tematica: 'Sociedad', likes: 34, likedPorMi: true,
  },
  {
    id: 'c2', pregunta: '¿Deberían las universidades ser gratuitas para todos?',
    usuario: '@VozClara', avatar: 'https://i.pravatar.cc/80?img=47', anio: 2023,
    tematica: 'Educación', likes: 29, likedPorMi: false,
  },
  {
    id: 'c3', pregunta: '¿Debe permitirse la experimentación animal en la ciencia?',
    usuario: '@Argumentador', avatar: 'https://i.pravatar.cc/80?img=33', anio: 2024,
    tematica: 'Ética', likes: 21, likedPorMi: false,
  },
  {
    id: 'c4', pregunta: '¿Es la inteligencia artificial una amenaza para el empleo?',
    usuario: '@RetorikaFan', avatar: 'https://i.pravatar.cc/80?img=8', anio: 2024,
    tematica: 'Tecnología', likes: 45, likedPorMi: false,
  },
  {
    id: 'c5', pregunta: '¿Deberían los países desarrollados acoger más refugiados?',
    usuario: '@LogicaPura', avatar: 'https://i.pravatar.cc/80?img=21', anio: 2023,
    tematica: 'Política', likes: 18, likedPorMi: false,
  },
];

const POR_PAGINA = 6;

@Component({
  selector        : 'app-banco-preguntas',
  standalone      : true,
  imports         : [CommonModule, FormsModule],
  templateUrl     : './banco-preguntas.html',
  styleUrl        : './banco-preguntas.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class BancoPreguntas {

  /* ── Estado ── */
  tab           = signal<TabPreguntas>('oficiales');
  busqueda      = signal('');
  anioFiltro    = signal<number | null>(null);
  tematicaFiltro= signal<string | null>(null);
  paginaActual  = signal(1);

  modalNuevaAbierto = signal(false);
  modalCompartirAbierto = signal(false);
  preguntaCompartir = signal<string>('');

  /* ── Data ── */
  oficiales = signal<PreguntaOficial[]>(MOCK_OFICIALES);
  comunidad = signal<PreguntaComunidad[]>(MOCK_COMUNIDAD);

  /* ── Stats globales (fijas, no dependen del filtro) ── */
  readonly totalPreguntas = MOCK_OFICIALES.length + MOCK_COMUNIDAD.length;
  readonly totalTorneos   = new Set(MOCK_OFICIALES.map(p => p.torneo)).size;
  readonly aniosHistorial = (() => {
    const todos = [...MOCK_OFICIALES.map(p => p.anio), ...MOCK_COMUNIDAD.map(p => p.anio)];
    return Math.max(...todos) - Math.min(...todos) + 1;
  })();

  /* ── Temáticas disponibles para el filtro ── */
  tematicas = computed<string[]>(() => {
    const lista = this.tab() === 'oficiales' ? this.oficiales()
                : this.tab() === 'comunidad' ? this.comunidad()
                : [...this.oficiales().filter(p => p.likedPorMi), ...this.comunidad().filter(p => p.likedPorMi)];
    return [...new Set(lista.map(p => p.tematica))].sort();
  });

  /* ── Años disponibles para el filtro ── */
  anios = computed<number[]>(() => {
    const lista = this.tab() === 'oficiales' ? this.oficiales()
                : this.tab() === 'comunidad' ? this.comunidad()
                : [...this.oficiales().filter(p => p.likedPorMi), ...this.comunidad().filter(p => p.likedPorMi)];
    return [...new Set(lista.map(p => p.anio))].sort((a, b) => b - a);
  });

  /* ── Preguntas filtradas (genérico según tab) ── */
  preguntasFiltradas = computed<(PreguntaOficial | PreguntaComunidad)[]>(() => {
    const q       = this.busqueda().toLowerCase().trim();
    const anio    = this.anioFiltro();
    const tematica= this.tematicaFiltro();

    let lista: (PreguntaOficial | PreguntaComunidad)[];

    if (this.tab() === 'oficiales') {
      lista = this.oficiales();
    } else if (this.tab() === 'comunidad') {
      lista = this.comunidad();
    } else {
      // Tu colección: todas las que tienen like, de ambos orígenes
      lista = [
        ...this.oficiales().filter(p => p.likedPorMi),
        ...this.comunidad().filter(p => p.likedPorMi),
      ];
    }

    return lista.filter(p => {
      if (anio && p.anio !== anio)                 return false;
      if (tematica && p.tematica !== tematica)      return false;
      if (q && !p.pregunta.toLowerCase().includes(q)
            && !this.origenTexto(p).toLowerCase().includes(q)) return false;
      return true;
    });
  });

  /* ── Paginación ── */
  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.preguntasFiltradas().length / POR_PAGINA))
  );

  totalColeccion = computed(() =>
    this.oficiales().filter(p => p.likedPorMi).length +
    this.comunidad().filter(p => p.likedPorMi).length
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

  /* ── Helpers de tipo ── */
  esOficial(p: PreguntaOficial | PreguntaComunidad): p is PreguntaOficial {
    return 'torneo' in p;
  }

  origenTexto(p: PreguntaOficial | PreguntaComunidad): string {
    return this.esOficial(p) ? `${p.torneo} ${p.club}` : `${p.usuario}`;
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
    if (this.esOficial(p)) {
      this.oficiales.update(lista => lista.map(item =>
        item.id === p.id
          ? { ...item, likedPorMi: !item.likedPorMi, likes: item.likes + (item.likedPorMi ? -1 : 1) }
          : item
      ));
    } else {
      this.comunidad.update(lista => lista.map(item =>
        item.id === p.id
          ? { ...item, likedPorMi: !item.likedPorMi, likes: item.likes + (item.likedPorMi ? -1 : 1) }
          : item
      ));
    }
  }

  /* ── Modal pregunta nueva (visual, sin lógica de guardado real) ── */
  abrirModalNueva(): void {
    this.modalNuevaAbierto.set(true);
  }

  cerrarModalNueva(): void {
    this.modalNuevaAbierto.set(false);
  }

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

  cerrarCompartir(): void {
    this.modalCompartirAbierto.set(false);
  }

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
      discord : '#', // TODO: discord no tiene share-url estándar
      gmail   : `https://mail.google.com/mail/?view=cm&su=Pregunta%20de%20debate&body=${texto}`,
      outlook : `https://outlook.live.com/mail/0/deeplink/compose?body=${texto}`,
    };
    if (urls[canal] && urls[canal] !== '#') {
      window.open(urls[canal], '_blank');
    }
    this.cerrarCompartir();
  }
}
