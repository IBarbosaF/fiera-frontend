import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DebateService, TemaApi, SubTurnoConfig } from '../../../core/services/debate.service';
import { AuthService } from '../../../core/services/auth.service';
import { Particles } from '../../../shared/components/particles/particles';

/* ============================================================
   CrearDebate — Wizard de 7 pasos
============================================================ */

export type PasoDebate = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Participante = 'yo' | 'fiera' | 'companero';

/* ── Intervención simplificada para el paso 5 ──
   Una fila = una intervención con un tiempo que aplica
   a favor y contra. Al guardar se expande a dos SubTurnoConfig. */
export interface IntervencionConfig {
  id        : string;
  nombre    : string;
  minutos   : number;
  activo    : boolean;
  asignadoF : Participante; /* quien hace el turno a favor */
  asignadoC : Participante; /* quien hace el turno en contra */
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
  { nombre: 'política',         icono: 'ti-building', color: '#156fe7', bg: 'rgba(21,111,231,0.12)'  },
  { nombre: 'política global',  icono: 'ti-world',    color: '#03d26e', bg: 'rgba(3,210,110,0.12)'   },
  { nombre: 'ética',            icono: 'ti-scale',    color: '#ff3a72', bg: 'rgba(255,58,114,0.12)'  },
  { nombre: 'social',           icono: 'ti-users',    color: '#f0a742', bg: 'rgba(240,167,66,0.12)'  },
  { nombre: 'socio-política',   icono: 'ti-flag',     color: '#156fe7', bg: 'rgba(21,111,231,0.12)'  },
  { nombre: 'socio-económica',  icono: 'ti-coin',     color: '#03d26e', bg: 'rgba(3,210,110,0.12)'   },
  { nombre: 'socio-cultural',   icono: 'ti-palette',  color: '#ff3a72', bg: 'rgba(255,58,114,0.12)'  },
  { nombre: 'educación',        icono: 'ti-school',   color: '#f0a742', bg: 'rgba(240,167,66,0.12)'  },
  { nombre: 'tecnología (IA)',  icono: 'ti-cpu',      color: '#156fe7', bg: 'rgba(21,111,231,0.12)'  },
  { nombre: 'medioambiente',    icono: 'ti-leaf',     color: '#03d26e', bg: 'rgba(3,210,110,0.12)'   },
  { nombre: 'salud',            icono: 'ti-heart',    color: '#ff3a72', bg: 'rgba(255,58,114,0.12)'  },
  { nombre: 'político-económica', icono: 'ti-trending-up', color: '#f0a742', bg: 'rgba(240,167,66,0.12)' },
  { nombre: 'derecho',          icono: 'ti-gavel',    color: '#156fe7', bg: 'rgba(21,111,231,0.12)'  },
  { nombre: 'arte',             icono: 'ti-brush',    color: '#03d26e', bg: 'rgba(3,210,110,0.12)'   },
  { nombre: 'ambiental',        icono: 'ti-tree',     color: '#ff3a72', bg: 'rgba(255,58,114,0.12)'  },
];

/* Intervenciones base — una fila por intervención */
const INTERVENCIONES_BASE: IntervencionConfig[] = [
  { id: 'intro', nombre: 'Introducción',  minutos: 3, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
  { id: 'ref1',  nombre: '1ª Refutación', minutos: 4, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
  { id: 'ref2',  nombre: '2ª Refutación', minutos: 5, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
  { id: 'conc',  nombre: 'Conclusión',    minutos: 3, activo: true, asignadoF: 'yo',   asignadoC: 'fiera' },
];

/* Nombres ordinales para refutaciones extra */
const ORDINALES = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª'];

@Component({
  selector        : 'app-crear-debate',
  standalone      : true,
  imports         : [RouterLink, Particles],
  templateUrl     : './crear-debate.html',
  styleUrl        : './crear-debate.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class CrearDebate implements OnInit {

  debateService = inject(DebateService);
  authService   = inject(AuthService);
  router        = inject(Router);

  pasoActivo = signal<PasoDebate>(1);

  infoPaso = computed(() => {
    const pasos: Record<number, { titulo: string; desc: string }> = {
      1: { titulo: 'Entrena con compañeros',  desc: 'Invita a tu equipo y practicad juntos contra FIERA.' },
      2: { titulo: 'Elige a tu rival',         desc: 'Define la personalidad y dificultad de FIERA para este entrenamiento.' },
      3: { titulo: 'El tema lo es todo',       desc: 'Un buen debate empieza con un buen tema. Elige el tuyo.' },
      4: { titulo: 'Define tu postura',        desc: 'Defiende tu posición con argumentos sólidos y evidencia.' },
      5: { titulo: 'Estructura el debate',     desc: 'Configura los turnos y el tiempo de cada intervención.' },
      6: { titulo: 'Asigna los participantes', desc: 'Decide quién debate en cada turno: tú, FIERA o un compañero.' },
      7: { titulo: 'Todo listo para debatir',  desc: 'Revisa tu configuración y empieza cuando estés preparado.' },
    };
    return pasos[this.pasoActivo()];
  });

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }

  /* ── PASO 1 ── */
  tabInvitar   = signal<'codigo' | 'enlace'>('codigo');
  codigoSesion = signal('FIERA-7XJ4');
  companeros   = signal<Companero[]>([
    { iniciales: 'ML', nombre: 'María López', estado: 'pendiente' },
    { iniciales: 'CR', nombre: 'Carlos Ruiz', estado: 'pendiente' },
  ]);

  copiarCodigo(): void {
    navigator.clipboard?.writeText(this.codigoSesion()).catch(() => {});
  }

  /* ── PASO 2 ── */
  setPersonalidad(valor: string): void {
    this.debateService.actualizarConfig({ personalidad: valor as 'agresiva' | 'elegante' | 'sarcastica' });
  }

  setDificultad(valor: string): void {
    this.debateService.actualizarConfig({ dificultad: valor as 'basico' | 'medio' | 'avanzado' });
  }

  /* ── PASO 3 ── */
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
      next : (temas) => { this.temas.set(temas); this.cargandoTemas.set(false); },
      error: ()      => { this.errorTemas.set(true); this.cargandoTemas.set(false); }
    });
  }

  seleccionarCategoria(cat: CategoriaItem): void {
    this.categoriaActiva.set(cat);
    const filtrados = this.temas().filter(
      t => t.categoria.trim().toLowerCase() === cat.nombre.trim().toLowerCase()
    );
    this.temasFiltrados.set(filtrados);
    this.temaSeleccionado.set(null);
  }

  volverCategorias(): void {
    this.categoriaActiva.set(null);
    this.temaSeleccionado.set(null);
  }

  seleccionarTema(tema: TemaApi): void {
    this.temaSeleccionado.set(tema);
    this.debateService.actualizarConfig({ tema: { id: tema.id, enunciado: tema.enunciado, categoria: tema.categoria } });
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
    this.temasFiltrados.set(this.temas().filter(t => t.categoria.toLowerCase() === aleatorio.categoria.toLowerCase()));
  }

  actualizarTemaManual(): void {
    if (this.temaManual() && this.enunciadoManual()) {
      this.debateService.actualizarConfig({ tema: { enunciado: this.enunciadoManual(), categoria: this.temaManual(), manual: true } });
    }
  }

  contarTemasPorCategoria(cat: string): number {
    return this.temas().filter(
      t => t.categoria.trim().toLowerCase() === cat.trim().toLowerCase()
    ).length;
  }

  /* ── PASO 4 ── */
  setPostura(valor: string): void {
    this.debateService.actualizarConfig({ postura: valor as 'favor' | 'contra' | 'aleatoria' });

    /* Actualizar asignados según la postura elegida */
    const miPostura   = valor === 'contra' ? 'asignadoC' : 'asignadoF';
    const fieraPostura = valor === 'contra' ? 'asignadoF' : 'asignadoC';

    this.intervenciones.update(lista =>
      lista.map(t => ({
        ...t,
        asignadoF: valor === 'contra' ? 'fiera' : 'yo',
        asignadoC: valor === 'contra' ? 'yo'   : 'fiera'
      }))
    );
  }

  /* ── PASO 5 — Intervenciones ── */
  intervenciones = signal<IntervencionConfig[]>(
    INTERVENCIONES_BASE.map(t => ({ ...t }))
  );

  setModo(valor: string): void {
    this.debateService.actualizarConfig({ modo: valor as 'completo' | 'express' });
  }

  toggleIntervencion(id: string): void {
    this.intervenciones.update(lista =>
      lista.map(t => t.id === id ? { ...t, activo: !t.activo } : t)
    );
  }

  cambiarTiempo(id: string, delta: number): void {
    this.intervenciones.update(lista =>
      lista.map(t => t.id === id ? { ...t, minutos: Math.min(15, Math.max(1, t.minutos + delta)) } : t)
    );
  }

  anadirRefutacion(): void {
    const refs = this.intervenciones().filter(t => t.id.startsWith('ref'));
    const siguiente = refs.length + 1;
    const ordinal   = ORDINALES[refs.length] ?? `${siguiente}ª`;
    const conclusionIdx = this.intervenciones().findIndex(t => t.id === 'conc');
    this.intervenciones.update(lista => {
      const postura = this.config.postura;
      const nueva: IntervencionConfig = {
        id       : `ref${siguiente}`,
        nombre   : `${ordinal} Refutación`,
        minutos  : 4,
        activo   : true,
        asignadoF: postura === 'contra' ? 'fiera' : 'yo',
        asignadoC: postura === 'contra' ? 'yo'    : 'fiera'
      };
      const copia = [...lista];
      copia.splice(conclusionIdx, 0, nueva);
      return copia;
    });
  }

  eliminarRefutacion(id: string): void {
    const refs = this.intervenciones().filter(t => t.id.startsWith('ref'));
    if (refs.length <= 1) return; // mínimo 1 refutación
    this.intervenciones.update(lista => lista.filter(t => t.id !== id));
  }

  tiempoTotal = computed(() =>
    this.intervenciones()
      .filter(t => t.activo)
      .reduce((acc, t) => acc + t.minutos * 2, 0) // × 2 porque cada intervención tiene favor y contra
  );

  /* ── PASO 6 — Participantes ── */
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

  /* Convierte IntervencionConfig[] → SubTurnoConfig[] para el servicio */
  private expandirASubturnos(): SubTurnoConfig[] {
    const subturnos: SubTurnoConfig[] = [];
    this.intervenciones().filter(t => t.activo).forEach(t => {
      subturnos.push({ id: `${t.id}-f`, nombre: t.nombre, postura: 'favor',  minutos: t.minutos, activo: true, asignado: t.asignadoF });
      subturnos.push({ id: `${t.id}-c`, nombre: t.nombre, postura: 'contra', minutos: t.minutos, activo: true, asignado: t.asignadoC });
    });
    return subturnos;
  }

  /* ── PASO 7 — Resumen ── */
  textoPostura(): string {
    const map = { favor: 'A favor', contra: 'En contra', aleatoria: 'Aleatoria' };
    return map[this.config.postura] ?? '—';
  }

  textoDificultad(): string {
    const map = { basico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
    return map[this.config.dificultad] ?? '—';
  }

  textoModo(): string {
    const map = { completo: 'Debate completo', express: 'Debate express' };
    return map[this.config.modo] ?? '—';
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

  /* ── Navegación ── */
  ir(paso: number): void {
    if (paso >= 1 && paso <= 7) this.pasoActivo.set(paso as PasoDebate);
  }

  siguiente(): void { this.ir(this.pasoActivo() + 1); }
  volver()   : void { this.ir(this.pasoActivo() - 1); }

  volverOHome(): void {
    if (this.pasoActivo() === 1) {
      this.router.navigate(['/']);
    } else {
      this.volver();
    }
  }

  /* ── Iniciar debate ── */
  iniciarDebate(): void {
    const subturnos = this.expandirASubturnos();
    this.debateService.guardarConfig();
    this.debateService.guardarSubturnos(subturnos);

    console.log('🚀 INICIAR DEBATE — Config:', this.debateService.config());
    console.log('🚀 INICIAR DEBATE — Subturnos:', subturnos);

    this.debateService.getFieras().subscribe(() => {
      console.log('🚀 FIERAS cargadas:', this.debateService.fieras());

      this.debateService.crearDebate().subscribe({
        next: (debate) => {
          console.log('✅ DEBATE CREADO:', debate);
          console.log('✅ Intervenciones del backend:', debate?.intervenciones);

          if (debate?.id) {
            this.debateService.setDebateId(debate.id);
            this.debateService.setDebateActivo(debate);
          }
          this.router.navigate(['partida-debate']);
        },
        error: (err) => {
          console.error('❌ ERROR AL CREAR DEBATE:', err);
          this.router.navigate(['partida-debate']);
        }
      });
    });
  }

  /* ── Helpers ── */
  get config() { return this.debateService.config(); }

  formatearTiempo(minutos: number): string {
    return `${String(minutos).padStart(2, '0')}:00`;
  }

  ngOnInit(): void {
    this.cargarTemas();
    this.debateService.getFieras().subscribe();
  }
}
