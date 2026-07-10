import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DebateService, TemaApi, SubTurnoConfig } from '../../../core/services/debate.service';

/* ============================================================
   CrearDebate — Wizard dinámico
   Académico: 7 pasos | Careo: 6 pasos (sin compañero ni participantes)
============================================================ */

export type ModoDebate    = 'academico' | 'careo';
export type Participante  = 'yo' | 'fiera' | 'companero';
export type TipoTurno     = 'intro' | 'ref' | 'conc' | 'cruzada';

/* ── Intervención académica ── */
export interface IntervencionConfig {
  id       : string;
  tipo     : TipoTurno;
  nombre   : string;
  segundos : number;   /* duración en segundos — permite 30s, 60s, 90s... */
  activo   : boolean;
  asignadoF: Participante;
  asignadoC: Participante;
}

export interface Companero {
  iniciales: string;
  nombre   : string;
  estado   : 'pendiente' | 'unido';
}

export interface CategoriaItem {
  nombre: string;
  icono : string;
  color : string;
  bg    : string;
}

const CATEGORIAS: CategoriaItem[] = [
  { nombre: 'política',           icono: 'ti-building',    color: '#156fe7', bg: 'rgba(21,111,231,0.12)' },
  { nombre: 'política global',    icono: 'ti-world',       color: '#03d26e', bg: 'rgba(3,210,110,0.12)'  },
  { nombre: 'ética',              icono: 'ti-scale',       color: '#ff3a72', bg: 'rgba(255,58,114,0.12)' },
  { nombre: 'social',             icono: 'ti-users',       color: '#f0a742', bg: 'rgba(240,167,66,0.12)' },
  { nombre: 'socio-política',     icono: 'ti-flag',        color: '#156fe7', bg: 'rgba(21,111,231,0.12)' },
  { nombre: 'socio-económica',    icono: 'ti-coin',        color: '#03d26e', bg: 'rgba(3,210,110,0.12)'  },
  { nombre: 'socio-cultural',     icono: 'ti-palette',     color: '#ff3a72', bg: 'rgba(255,58,114,0.12)' },
  { nombre: 'educación',          icono: 'ti-school',      color: '#f0a742', bg: 'rgba(240,167,66,0.12)' },
  { nombre: 'tecnología (IA)',    icono: 'ti-cpu',         color: '#156fe7', bg: 'rgba(21,111,231,0.12)' },
  { nombre: 'medioambiente',      icono: 'ti-leaf',        color: '#03d26e', bg: 'rgba(3,210,110,0.12)'  },
  { nombre: 'salud',              icono: 'ti-heart',       color: '#ff3a72', bg: 'rgba(255,58,114,0.12)' },
  { nombre: 'político-económica', icono: 'ti-trending-up', color: '#f0a742', bg: 'rgba(240,167,66,0.12)' },
  { nombre: 'derecho',            icono: 'ti-gavel',       color: '#156fe7', bg: 'rgba(21,111,231,0.12)' },
  { nombre: 'arte',               icono: 'ti-brush',       color: '#03d26e', bg: 'rgba(3,210,110,0.12)'  },
  { nombre: 'ambiental',          icono: 'ti-tree',        color: '#ff3a72', bg: 'rgba(255,58,114,0.12)' },
];

/* Intervenciones base académico */
const INTERVENCIONES_ACADEMICO: IntervencionConfig[] = [
  { id: 'intro', tipo: 'intro', nombre: 'Introducción',  segundos: 180, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
  { id: 'ref1',  tipo: 'ref',   nombre: '1ª Refutación', segundos: 240, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
  { id: 'ref2',  tipo: 'ref',   nombre: '2ª Refutación', segundos: 300, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
  { id: 'conc',  tipo: 'conc',  nombre: 'Conclusión',    segundos: 180, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
];

const ORDINALES = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª'];

/* Pasos según modo:
   Académico: 1=Config, 2=Compañero, 3=FIERA, 4=Tema, 5=Postura, 6=Participantes, 7=Resumen
   Careo:     1=Config, 2=FIERA,     3=Tema,  4=Postura, 5=Resumen */
const PASOS_ACADEMICO = [1, 2, 3, 4, 5, 6, 7];
const PASOS_CAREO     = [1, 2, 3, 4, 5];

@Component({
  selector        : 'app-crear-debate',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './crear-debate.html',
  styleUrl        : './crear-debate.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class CrearDebate implements OnInit {

  debateService = inject(DebateService);
  router        = inject(Router);

  /* ── Modo y paso activo ── */
  modoDebate  = signal<ModoDebate>('academico');
  pasoActivo  = signal(1);

  pasos = computed(() =>
    this.modoDebate() === 'academico' ? PASOS_ACADEMICO : PASOS_CAREO
  );

  totalPasos = computed(() => this.pasos().length);

  /* Etiquetas de cada paso según modo */
  labelPaso = computed(() => {
    if (this.modoDebate() === 'academico') {
      return ['Configuración', 'Compañero', 'FIERA', 'Tema', 'Postura', 'Participantes', 'Resumen'];
    }
    return ['Configuración', 'FIERA', 'Tema', 'Postura', 'Resumen'];
  });

  /* ── Navegación ── */
  siguiente(): void {
    if (this.pasoActivo() < this.totalPasos()) {
      this.pasoActivo.update(p => p + 1);
    }
  }

  volver(): void {
    if (this.pasoActivo() > 1) {
      this.pasoActivo.update(p => p - 1);
    }
  }

  volverOHome(): void {
    if (this.pasoActivo() === 1) {
      this.router.navigate(['/']);
    } else {
      this.volver();
    }
  }

  setModoDebate(modo: ModoDebate): void {
    this.modoDebate.set(modo);
    this.pasoActivo.set(1);
    /* Resetear intervenciones al cambiar de modo */
    if (modo === 'academico') {
      this.intervenciones.set(INTERVENCIONES_ACADEMICO.map(t => ({ ...t })));
    }
  }

  /* Helpers para saber qué paso es en cada modo */
  get esCareo()     { return this.modoDebate() === 'academico' ? false : true; }
  get esAcademico() { return this.modoDebate() === 'academico'; }

  /* En académico los pasos son fijos 1-7
     En careo: 1=Config, 2=FIERA, 3=Tema, 4=Postura, 5=Resumen */
  get pasoLabel(): string {
    return this.labelPaso()[this.pasoActivo() - 1] ?? '';
  }

  /* ────────────────────────────────────────────
     PASO 1 — Configuración (tipo + turnos/careo)
  ──────────────────────────────────────────── */

  /* ── Académico: intervenciones con drag&drop ── */
  intervenciones = signal<IntervencionConfig[]>(
    INTERVENCIONES_ACADEMICO.map(t => ({ ...t }))
  );

  /* Drag & drop */
  dragIndex = signal<number | null>(null);

  onDragStart(index: number): void {
    this.dragIndex.set(index);
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
  }

  onDrop(index: number): void {
    const from = this.dragIndex();
    if (from === null || from === index) return;
    this.intervenciones.update(lista => {
      const copia = [...lista];
      const [item] = copia.splice(from, 1);
      copia.splice(index, 0, item);
      return copia;
    });
    this.dragIndex.set(null);
  }

  onDragEnd(): void {
    this.dragIndex.set(null);
  }

  toggleIntervencion(id: string): void {
    this.intervenciones.update(lista =>
      lista.map(t => t.id === id ? { ...t, activo: !t.activo } : t)
    );
  }

  /* Tiempo en pasos de 30s */
  cambiarTiempo(id: string, delta: number): void {
    this.intervenciones.update(lista =>
      lista.map(t => {
        if (t.id !== id) return t;
        const max = t.tipo === 'cruzada' ? 300 : 900; /* cruzada max 5min, resto 15min */
        const min = 30;
        return { ...t, segundos: Math.min(max, Math.max(min, t.segundos + delta * 30)) };
      })
    );
  }

  anadirRefutacion(): void {
    const refs      = this.intervenciones().filter(t => t.tipo === 'ref');
    const siguiente = refs.length + 1;
    const ordinal   = ORDINALES[refs.length] ?? `${siguiente}ª`;
    const concIdx   = this.intervenciones().findIndex(t => t.tipo === 'conc');
    const postura   = this.config.postura;

    this.intervenciones.update(lista => {
      const nueva: IntervencionConfig = {
        id       : `ref${siguiente}`,
        tipo     : 'ref',
        nombre   : `${ordinal} Refutación`,
        segundos : 240,
        activo   : true,
        asignadoF: postura === 'contra' ? 'fiera' : 'yo',
        asignadoC: postura === 'contra' ? 'yo'    : 'fiera'
      };
      const copia = [...lista];
      copia.splice(concIdx, 0, nueva);
      return copia;
    });
  }

  anadirCruzada(): void {
    const cruzadas  = this.intervenciones().filter(t => t.tipo === 'cruzada');
    const siguiente = cruzadas.length + 1;
    const concIdx   = this.intervenciones().findIndex(t => t.tipo === 'conc');
    const postura   = this.config.postura;

    this.intervenciones.update(lista => {
      const nueva: IntervencionConfig = {
        id       : `cruzada${siguiente}`,
        tipo     : 'cruzada',
        nombre   : `${siguiente}ª Cruzada`,
        segundos : 60,
        activo   : true,
        asignadoF: postura === 'contra' ? 'fiera' : 'yo',
        asignadoC: postura === 'contra' ? 'yo'    : 'fiera'
      };
      const copia = [...lista];
      copia.splice(concIdx, 0, nueva);
      return copia;
    });
  }

  tiempoTotal = computed(() =>
    this.intervenciones()
      .filter(t => t.activo)
      .reduce((acc, t) => acc + t.segundos * 2, 0)
  );

  /* ── Careo ── */
  tiempoCareo = signal<60 | 120>(60); /* 1min o 2min en segundos */

  readonly TURNOS_CAREO = [
    { id: 'exp-f', nombre: 'Exposición inicial', postura: 'favor'  },
    { id: 'exp-c', nombre: 'Exposición inicial', postura: 'contra' },
    { id: 'rep-f', nombre: 'Réplica',            postura: 'favor'  },
    { id: 'rep-c', nombre: 'Réplica',            postura: 'contra' },
  ];

  /* ────────────────────────────────────────────
     PASO 2 (académico) — Invitar compañero
  ──────────────────────────────────────────── */
  tabInvitar     = signal<'codigo' | 'enlace'>('codigo');
  codigoSesion   = signal('FIERA-7XJ4');
  companeros     = signal<Companero[]>([
    { iniciales: 'ML', nombre: 'María López', estado: 'pendiente' },
    { iniciales: 'CR', nombre: 'Carlos Ruiz', estado: 'pendiente' },
  ]);

  copiarCodigo(): void {
    navigator.clipboard?.writeText(this.codigoSesion()).catch(() => {});
  }

  enlaceCopiado = signal(false);

  copiarEnlace(): void {
    navigator.clipboard?.writeText(this.enlaceCompartir).catch(() => {});
    this.enlaceCopiado.set(true);
    setTimeout(() => this.enlaceCopiado.set(false), 2000);
  }

  compartirEnlace(): void {
    if (window.innerWidth < 768 && navigator.share) {
      navigator.share({
        title: 'FIERA — Debate',
        text : `¡Únete a mi debate en FIERA! Código: ${this.codigoSesion()}`,
        url  : this.enlaceCompartir
      }).catch(() => {});
      return;
    }
    this.modalCompartirAbierto.set(true);
  }

  modalCompartirAbierto = signal(false);

  get enlaceCompartir(): string {
    return `https://fiera.retorika.es/unirse/${this.codigoSesion()}`;
  }

  /* ────────────────────────────────────────────
     PASO FIERA (académico=3, careo=2)
  ──────────────────────────────────────────── */
  setPersonalidad(valor: string): void {
    this.debateService.actualizarConfig({ personalidad: valor as 'agresiva' | 'elegante' | 'sarcastica' });
  }

  setDificultad(valor: string): void {
    this.debateService.actualizarConfig({ dificultad: valor as 'basico' | 'medio' | 'avanzado' });
  }

  /* ────────────────────────────────────────────
     PASO TEMA (académico=4, careo=3)
  ──────────────────────────────────────────── */
  temas            = signal<TemaApi[]>([]);
  cargandoTemas    = signal(false);
  errorTemas       = signal(false);
  pestanaActiva    = signal<'banco' | 'manual'>('banco');
  categorias       = CATEGORIAS;
  categoriaActiva  = signal<CategoriaItem | null>(null);
  temasFiltrados   = signal<TemaApi[]>([]);
  temaSeleccionado = signal<TemaApi | null>(null);
  temaManual       = signal('');
  enunciadoManual  = signal('');

  cargarTemas(): void {
    this.cargandoTemas.set(true);
    this.errorTemas.set(false);
    this.debateService.getTemas().subscribe({
      next : temas => { this.temas.set(temas); this.cargandoTemas.set(false); },
      error: ()    => { this.errorTemas.set(true); this.cargandoTemas.set(false); }
    });
  }

  seleccionarCategoria(cat: CategoriaItem): void {
    this.categoriaActiva.set(cat);
    this.temasFiltrados.set(
      this.temas().filter(t => t.categoria.trim().toLowerCase() === cat.nombre.trim().toLowerCase())
    );
    this.temaSeleccionado.set(null);
  }

  volverCategorias(): void {
    this.categoriaActiva.set(null);
    this.temaSeleccionado.set(null);
  }

  seleccionarTema(tema: TemaApi): void {
    this.temaSeleccionado.set(tema);
    this.debateService.actualizarConfig({
      tema: { enunciado: tema.enunciado, categoria: tema.categoria }
    });
  }

  temaAleatorio(): void {
    const lista = this.temasFiltrados();
    if (!lista.length) return;
    this.seleccionarTema(lista[Math.floor(Math.random() * lista.length)]);
  }

  temaAleatorioGlobal(): void {
    const lista = this.temas();
    if (!lista.length) return;
    const aleatorio = lista[Math.floor(Math.random() * lista.length)];
    this.seleccionarTema(aleatorio);
    const cat = this.categorias.find(c => c.nombre.toLowerCase() === aleatorio.categoria.toLowerCase()) ?? null;
    this.categoriaActiva.set(cat);
    this.temasFiltrados.set(
      this.temas().filter(t => t.categoria.toLowerCase() === aleatorio.categoria.toLowerCase())
    );
  }

  actualizarTemaManual(): void {
    if (this.temaManual() && this.enunciadoManual()) {
      this.debateService.actualizarConfig({
        tema: { enunciado: this.enunciadoManual(), categoria: this.temaManual(), manual: true }
      });
    }
  }

  contarTemasPorCategoria(cat: string): number {
    return this.temas().filter(t => t.categoria.trim().toLowerCase() === cat.trim().toLowerCase()).length;
  }

  /* ────────────────────────────────────────────
     PASO POSTURA (académico=5, careo=4)
  ──────────────────────────────────────────── */
  setPostura(valor: string): void {
    this.debateService.actualizarConfig({ postura: valor as 'favor' | 'contra' | 'aleatoria' });
    this.intervenciones.update(lista =>
      lista.map(t => ({
        ...t,
        asignadoF: valor === 'contra' ? 'fiera' : 'yo',
        asignadoC: valor === 'contra' ? 'yo'    : 'fiera'
      }))
    );
  }

  /* ────────────────────────────────────────────
     PASO 6 (académico) — Participantes
  ──────────────────────────────────────────── */
  setAsignadoF(id: string, valor: Participante): void {
    this.intervenciones.update(lista =>
      lista.map(t => t.id === id ? { ...t, asignadoF: valor } : t)
    );
  }

  setAsignadoC(id: string, valor: Participante): void {
    this.intervenciones.update(lista =>
      lista.map(t => t.id === id ? { ...t, asignadoC: valor } : t)
    );
  }

  /* ── Expandir a SubTurnoConfig para el servicio ── */
  private expandirASubturnos(): SubTurnoConfig[] {
    if (this.modoDebate() === 'careo') {
      return this.TURNOS_CAREO.map(t => ({
        id      : t.id,
        nombre  : t.nombre,
        postura : t.postura as 'favor' | 'contra',
        minutos : this.tiempoCareo() / 60,
        segundos: this.tiempoCareo(),
        activo  : true,
        asignado: t.postura === 'favor'
          ? (this.config.postura === 'contra' ? 'fiera' : 'yo')
          : (this.config.postura === 'contra' ? 'yo'    : 'fiera')
      }));
    }

    const subturnos: SubTurnoConfig[] = [];
    this.intervenciones().filter(t => t.activo).forEach(t => {
      subturnos.push({ id: `${t.id}-f`, nombre: t.nombre, postura: 'favor',  minutos: Math.ceil(t.segundos / 60), segundos: t.segundos, activo: true, asignado: t.asignadoF });
      subturnos.push({ id: `${t.id}-c`, nombre: t.nombre, postura: 'contra', minutos: Math.ceil(t.segundos / 60), segundos: t.segundos, activo: true, asignado: t.asignadoC });
    });
    return subturnos;
  }

  /* ────────────────────────────────────────────
     PASO RESUMEN — textos helpers
  ──────────────────────────────────────────── */
  textoPostura(): string {
    const map = { favor: 'A favor', contra: 'En contra', aleatoria: 'Aleatoria' };
    return map[this.config.postura] ?? '—';
  }

  textoDificultad(): string {
    const map = { basico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
    return map[this.config.dificultad] ?? '—';
  }

  textoModo(): string {
    return this.modoDebate() === 'academico' ? 'Debate académico' : 'Careo';
  }

  textoPersonalidad(): string {
    const map = { agresiva: 'Agresiva', elegante: 'Elegante', sarcastica: 'Sarcástica' };
    return this.config.personalidad ? map[this.config.personalidad] : '—';
  }

  textoParticipantes(): string {
    const subturnos = this.expandirASubturnos();
    const asignados = new Set(subturnos.map(t => t.asignado));
    const partes: string[] = [];
    if (asignados.has('yo'))        partes.push('Yo');
    if (asignados.has('fiera'))     partes.push('FIERA');
    if (asignados.has('companero')) partes.push('1 compañero');
    return partes.join(', ');
  }

  textoTiempoTotal(): string {
    if (this.modoDebate() === 'careo') {
      const total = this.TURNOS_CAREO.length * this.tiempoCareo();
      return this.formatearSegundos(total);
    }
    return this.formatearSegundos(this.tiempoTotal());
  }

  /* ────────────────────────────────────────────
     Iniciar debate
  ──────────────────────────────────────────── */
  iniciarDebate(): void {
    const subturnos = this.expandirASubturnos();
    this.debateService.guardarConfig();
    this.debateService.guardarSubturnos(subturnos);
    this.debateService.getFieras().subscribe(() => {
      this.debateService.crearDebate().subscribe({
        next: debate => {
          if (debate?.id) {
            this.debateService.setDebateId(debate.id);
            this.debateService.setDebateActivo(debate);

            /* Arrancar el debate en el backend (obligatorio antes
              de poder mandar turnos) y solo entonces navegar */
            this.debateService.iniciarDebate(debate.id).subscribe({
              next : () => this.router.navigate(['partida-debate']),
              error: () => this.router.navigate(['partida-debate']) /* fallback: navegar igual */
            });
          } else {
            this.router.navigate(['partida-debate']);
          }
        },
        error: () => this.router.navigate(['partida-debate'])
      });
    });
  }

  /* ── Helpers ── */
  get config() { return this.debateService.config(); }

  formatearSegundos(seg: number): string {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    if (s === 0) return `${String(m).padStart(2, '0')}:00`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.cargarTemas();
    this.debateService.getFieras().subscribe();
  }
}
