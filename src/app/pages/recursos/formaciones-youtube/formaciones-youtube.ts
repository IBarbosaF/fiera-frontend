import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';

/* ============================================================
   FormacionesYoutube — Vídeos de formación en debate
   Links a YouTube organizados por sección con me gustas
   TODO: conectar con backend cuando haya endpoints
============================================================ */

export interface VideoFormacion {
  id         : string;
  titulo     : string;
  descripcion: string;
  canal      : string;
  seccion    : SeccionId;
  anio       : number;
  duracion   : string;
  youtubeId  : string;
  tags       : string[];
  destacado  : boolean;
}

export type SeccionId =
  | 'academico'
  | 'roles'
  | 'argumentacion'
  | 'refutacion'
  | 'juzgar'
  | 'tematica'
  | 'coleccion';

export interface Seccion {
  id     : SeccionId;
  titulo : string;
  desc   : string;
  emoji  : string;
  color  : string;
}

/* ── Secciones ── */
const SECCIONES: Seccion[] = [
  { id: 'academico',     titulo: 'Debate académico',             desc: 'normas, conceptos generales',                                              emoji: '⚖️',  color: '#156fe7' },
  { id: 'roles',         titulo: 'Roles de debate',              desc: 'introductor, refutaciones, cruzada, conclusión, juez',                     emoji: '👥',  color: '#8b5cf6' },
  { id: 'argumentacion', titulo: 'Técnicas de argumentación',    desc: 'cómo construir y defender argumentos sólidos',                             emoji: '💬',  color: '#03d26e' },
  { id: 'refutacion',    titulo: 'Técnicas de refutación',       desc: 'cómo rebatir argumentos de la contraparte',                                emoji: '🛡️',  color: '#ef4444' },
  { id: 'juzgar',        titulo: 'Técnicas para juzgar',         desc: 'criterios, evaluación y feedback en debates',                              emoji: '🔨',  color: '#f0a742' },
  { id: 'tematica',      titulo: 'Temática de preguntas',        desc: 'tecnología, política, educación y más',                                    emoji: '🌐',  color: '#f59e0b' },
  { id: 'coleccion',     titulo: 'Tu colección',                 desc: 'tus vídeos guardados',                                                     emoji: '❤️',  color: '#ff3a72' },
];

/* ── Mockdata ── */
// TODO: reemplazar con llamada al backend
const MOCK_VIDEOS: VideoFormacion[] = [
  {
    id         : '1',
    titulo     : 'Qué es el debate académico y para qué sirve',
    descripcion: 'Introducción completa al debate académico: qué es, sus normas fundamentales y por qué es una herramienta clave de aprendizaje.',
    canal      : 'Academia de Debate',
    seccion    : 'academico',
    anio       : 2023,
    duracion   : '12:45',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Debate académico', 'Normas'],
    destacado  : true,
  },
  {
    id         : '2',
    titulo     : 'El papel del introductor en un debate',
    descripcion: 'Aprende cuál es la función del introductor, cómo estructurar tu discurso de apertura y qué errores evitar.',
    canal      : 'Oratoria y Debate',
    seccion    : 'roles',
    anio       : 2022,
    duracion   : '8:32',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Roles de debate', 'Introductor'],
    destacado  : true,
  },
  {
    id         : '3',
    titulo     : 'Cómo construir argumentos sólidos',
    descripcion: 'Técnicas avanzadas para construir argumentos que resistan la refutación: estructura, evidencia y coherencia.',
    canal      : 'Debate en Español',
    seccion    : 'argumentacion',
    anio       : 2024,
    duracion   : '10:15',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Técnicas de argumentación', 'Avanzado'],
    destacado  : true,
  },
  {
    id         : '4',
    titulo     : 'Cómo refutar sin atacar a la persona',
    descripcion: 'Claves para identificar falacias y refutar con contundencia sin caer en ataques personales.',
    canal      : 'Hablar con Ideas',
    seccion    : 'refutacion',
    anio       : 2023,
    duracion   : '9:41',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Técnicas de refutación', 'Falacias'],
    destacado  : true,
  },
  {
    id         : '5',
    titulo     : 'Primera refutación: estructura y consejos',
    descripcion: 'Todo lo que necesitas saber sobre el rol de primer refutador: qué refutar, cómo priorizar y cómo estructurar tu intervención.',
    canal      : 'Oratoria y Debate',
    seccion    : 'roles',
    anio       : 2022,
    duracion   : '7:58',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Roles de debate', 'Primera refutación'],
    destacado  : false,
  },
  {
    id         : '6',
    titulo     : 'Cómo ser un buen juez de debate',
    descripcion: 'Criterios de evaluación, cómo dar feedback constructivo y los errores más comunes al juzgar un debate.',
    canal      : 'Academia de Debate',
    seccion    : 'juzgar',
    anio       : 2021,
    duracion   : '10:05',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Técnicas para juzgar', 'Evaluación'],
    destacado  : false,
  },
  {
    id         : '7',
    titulo     : 'Cómo debatir sobre tecnología',
    descripcion: 'Enfoques, argumentos clave y errores frecuentes en debates sobre inteligencia artificial, redes sociales y privacidad.',
    canal      : 'Debate en Español',
    seccion    : 'tematica',
    anio       : 2024,
    duracion   : '8:47',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Temática de preguntas', 'Tecnología'],
    destacado  : false,
  },
  {
    id         : '8',
    titulo     : 'Reglas básicas del debate académico',
    descripcion: 'Conoce las normas fundamentales que rigen cualquier debate académico: tiempos, turnos, posturas y criterios de evaluación.',
    canal      : 'Academia de Debate',
    seccion    : 'academico',
    anio       : 2023,
    duracion   : '11:23',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Debate académico', 'Normas'],
    destacado  : false,
  },
  {
    id         : '9',
    titulo     : 'Técnicas de argumentación avanzadas',
    descripcion: 'Eleva la calidad de tus argumentos con técnicas avanzadas: analogías, casos, principios y su combinación.',
    canal      : 'Hablar con Ideas',
    seccion    : 'argumentacion',
    anio       : 2024,
    duracion   : '13:40',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Técnicas de argumentación', 'Avanzado'],
    destacado  : false,
  },
  {
    id         : '10',
    titulo     : 'Cómo debatir sobre relaciones internacionales',
    descripcion: 'Argumentos, contexto histórico y errores comunes en debates sobre política exterior, tratados y conflictos internacionales.',
    canal      : 'Debate en Español',
    seccion    : 'tematica',
    anio       : 2023,
    duracion   : '9:20',
    youtubeId  : 'dQw4w9WgXcQ',
    tags       : ['Temática de preguntas', 'Relaciones internacionales'],
    destacado  : false,
  },
];

const STORAGE_LIKES = 'fiera_formaciones_likes';

@Component({
  selector        : 'app-formaciones-youtube',
  standalone      : true,
  imports         : [CommonModule, FormsModule],
  templateUrl     : './formaciones-youtube.html',
  styleUrl        : './formaciones-youtube.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class FormacionesYoutube {

  /* ── Estado ── */
  busqueda          = signal('');
  seccionActiva     = signal<SeccionId | null>(null);
  anioFiltro        = signal<number | null>(null);
  soloMegusta       = signal(false);
  likes             = signal<Set<string>>(this.cargarLikes());

  readonly secciones = SECCIONES;

  /* ── Años disponibles para el filtro ── */
  readonly anios = [...new Set(MOCK_VIDEOS.map(v => v.anio))].sort((a, b) => b - a);

  /* ── Vídeos filtrados ── */
  videosFiltrados = computed<VideoFormacion[]>(() => {
    const q       = this.busqueda().toLowerCase().trim();
    const seccion = this.seccionActiva();
    const anio    = this.anioFiltro();
    const soloLikes = this.soloMegusta();
    const likesSet  = this.likes();

    return MOCK_VIDEOS.filter(v => {
      if (soloLikes && !likesSet.has(v.id))                       return false;
      if (seccion && seccion !== 'coleccion' && v.seccion !== seccion) return false;
      if (seccion === 'coleccion' && !likesSet.has(v.id))         return false;
      if (anio && v.anio !== anio)                                 return false;
      if (q && !v.titulo.toLowerCase().includes(q)
            && !v.descripcion.toLowerCase().includes(q)
            && !v.tags.some(t => t.toLowerCase().includes(q)))     return false;
      return true;
    });
  });

  /* ── Destacados ── */
  videosDestacados = computed(() =>
    MOCK_VIDEOS.filter(v => v.destacado)
  );

  /* ── Conteo por sección ── */
  conteoPorSeccion(id: SeccionId): number {
    if (id === 'coleccion') return this.likes().size;
    return MOCK_VIDEOS.filter(v => v.seccion === id).length;
  }

  /* ── Navegación sección ── */
  seleccionarSeccion(id: SeccionId): void {
    this.seccionActiva.set(this.seccionActiva() === id ? null : id);
  }

  /* ── Me gusta ── */
  tieneLike(id: string): boolean {
    return this.likes().has(id);
  }

  toggleLike(id: string, e: MouseEvent): void {
    e.stopPropagation();
    e.preventDefault();
    const set = new Set(this.likes());
    set.has(id) ? set.delete(id) : set.add(id);
    this.likes.set(set);
    localStorage.setItem(STORAGE_LIKES, JSON.stringify([...set]));
  }

  private cargarLikes(): Set<string> {
    const datos = localStorage.getItem(STORAGE_LIKES);
    return datos ? new Set(JSON.parse(datos)) : new Set();
  }

  /* ── Abrir YouTube ── */
  abrirYoutube(youtubeId: string, e: MouseEvent): void {
    e.stopPropagation();
    window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank');
  }

  /* ── Thumbnail ── */
  thumbnail(youtubeId: string): string {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  /* ── Color de sección ── */
  colorSeccion(id: SeccionId): string {
    return SECCIONES.find(s => s.id === id)?.color ?? '#156fe7';
  }

  /* ── Limpiar filtros ── */
  limpiarFiltros(): void {
    this.busqueda.set('');
    this.seccionActiva.set(null);
    this.anioFiltro.set(null);
    this.soloMegusta.set(false);
  }

  /* ── Helper ── */
  seccionTitulo(id: SeccionId): string {
    return SECCIONES.find(s => s.id === id)?.titulo ?? '';
  }
}
