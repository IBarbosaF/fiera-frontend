import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DebateService, TemaApi } from '../../core/services/debate.service';
import { AuthService } from '../../core/services/auth.service';
import { Particles } from '../../shared/components/particles/particles';

/* ============================================================
   ConfigDebateComponent — Configuración del debate (v2)

   Wizard de 7 pasos lineales:
   1. Invitar compañero   → código simulado + lista de invitados
   2. Configurar FIERA    → personalidad + nivel de dificultad
   3. Elegir tema         → categorías → temas | entrada manual
   4. Postura             → favor / contra / aleatoria
   5. Configurar debate   → modo + tabla de turnos con tiempos
   6. Participantes       → asignar turno a yo / fiera / compañero
   7. Resumen             → revisión final + iniciar debate

   Layout desktop: panel izquierdo decorativo + panel derecho con formulario
   Layout móvil  : una sola columna (card centrada)
============================================================ */

export type PasoDebate = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/* Participante asignable a cada sub-turno */
export type Participante = 'yo' | 'fiera' | 'companero';

/* Sub-turno del paso 5 y 6 */
export interface SubTurnoConfig {
  id      : string;
  nombre  : string;
  postura : 'favor' | 'contra';
  minutos : number;
  activo  : boolean;
  asignado: Participante;
}

/* Compañero invitado (simulado) */
export interface Companero {
  iniciales: string;
  nombre   : string;
  estado   : 'pendiente' | 'unido';
}

/* Categorías del banco de temas */
export interface CategoriaItem {
  nombre: string;
  icono : string;
  color : string;
  bg    : string;
}

const CATEGORIAS: CategoriaItem[] = [
  { nombre: 'Educación',     icono: 'ti-school',       color: '#156fe7', bg: 'rgba(21,111,231,0.12)'  },
  { nombre: 'Tecnología',    icono: 'ti-cpu',           color: '#03d26e', bg: 'rgba(3,210,110,0.12)'   },
  { nombre: 'Ética',         icono: 'ti-scale',         color: '#ff3a72', bg: 'rgba(255,58,114,0.12)'  },
  { nombre: 'Sociedad',      icono: 'ti-users',         color: '#f0a742', bg: 'rgba(240,167,66,0.12)'  },
  { nombre: 'Economía',      icono: 'ti-trending-up',   color: '#156fe7', bg: 'rgba(21,111,231,0.12)'  },
  { nombre: 'Medioambiente', icono: 'ti-leaf',          color: '#03d26e', bg: 'rgba(3,210,110,0.12)'   },
];

/* Sub-turnos base — se usan en pasos 5 y 6 */
const SUBTURNOS_BASE: SubTurnoConfig[] = [
  { id: 'intro-f',  nombre: 'Introducción',  postura: 'favor',  minutos: 3, activo: true, asignado: 'yo'       },
  { id: 'intro-c',  nombre: 'Introducción',  postura: 'contra', minutos: 3, activo: true, asignado: 'fiera'    },
  { id: 'ref1-f',   nombre: '1ª Refutación', postura: 'favor',  minutos: 4, activo: true, asignado: 'yo'       },
  { id: 'ref1-c',   nombre: '1ª Refutación', postura: 'contra', minutos: 4, activo: true, asignado: 'fiera'    },
  { id: 'ref2-f',   nombre: '2ª Refutación', postura: 'favor',  minutos: 5, activo: true, asignado: 'yo'       },
  { id: 'ref2-c',   nombre: '2ª Refutación', postura: 'contra', minutos: 5, activo: true, asignado: 'companero'},
  { id: 'conc-c',   nombre: 'Conclusión',    postura: 'contra', minutos: 3, activo: true, asignado: 'fiera'    },
  { id: 'conc-f',   nombre: 'Conclusión',    postura: 'favor',  minutos: 3, activo: true, asignado: 'yo'       },
];

@Component({
  selector        : 'app-config-debate',
  standalone      : true,
  imports         : [RouterLink, Particles],
  templateUrl     : './config-debate.html',
  styleUrl        : './config-debate.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class ConfigDebate implements OnInit {

  /* ── Servicios ── */
  debateService = inject(DebateService);
  authService   = inject(AuthService);
  router        = inject(Router);

  /* ── Paso activo ── */
  pasoActivo = signal<PasoDebate>(1);

  /* ── Info panel izquierdo (desktop) — cambia por paso ── */
  infoPaso = computed(() => {
    const pasos: Record<number, { titulo: string; desc: string }> = {
      1: { titulo: 'Entrena con compañeros',       desc: 'Invita a tu equipo y practicad juntos contra FIERA.' },
      2: { titulo: 'Elige a tu rival',              desc: 'Define la personalidad y dificultad de FIERA para este entrenamiento.' },
      3: { titulo: 'El tema lo es todo',            desc: 'Un buen debate empieza con un buen tema. Elige el tuyo.' },
      4: { titulo: 'Define tu postura',             desc: 'Defiende tu posición con argumentos sólidos y evidencia.' },
      5: { titulo: 'Estructura el debate',          desc: 'Configura los turnos y el tiempo de cada intervención.' },
      6: { titulo: 'Asigna los participantes',      desc: 'Decide quién debate en cada turno: tú, FIERA o un compañero.' },
      7: { titulo: 'Todo listo para debatir',       desc: 'Revisa tu configuración y empieza cuando estés preparado.' },
    };
    return pasos[this.pasoActivo()];
  });

  /* ── Cerrar sesión ── */
  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }

  /* ────────────────────────────────────────────
     PASO 1 — Invitar compañero
  ──────────────────────────────────────────── */
  tabInvitar     = signal<'codigo' | 'enlace'>('codigo');
  codigoSesion   = signal('FIERA-7XJ4');
  companeros     = signal<Companero[]>([
    { iniciales: 'ML', nombre: 'María López',  estado: 'pendiente' },
    { iniciales: 'CR', nombre: 'Carlos Ruiz',  estado: 'pendiente' },
  ]);

  copiarCodigo(): void {
    navigator.clipboard?.writeText(this.codigoSesion()).catch(() => {});
  }

  /* ────────────────────────────────────────────
     PASO 2 — Configurar FIERA
  ──────────────────────────────────────────── */
  setPersonalidad(valor: string): void {
    this.debateService.actualizarConfig({
      personalidad: valor as 'agresiva' | 'elegante' | 'sarcastica'
    });
  }

  setDificultad(valor: string): void {
    this.debateService.actualizarConfig({
      dificultad: valor as 'basico' | 'medio' | 'avanzado'
    });
  }

  /* ────────────────────────────────────────────
     PASO 3 — Elegir tema
  ──────────────────────────────────────────── */
  temas             = signal<TemaApi[]>([]);
  cargandoTemas     = signal(false);
  errorTemas        = signal(false);
  pestanaActiva     = signal<'banco' | 'manual'>('banco');
  categorias        = CATEGORIAS;
  categoriaActiva   = signal<CategoriaItem | null>(null);
  temasFiltrados    = signal<TemaApi[]>([]);
  temaSeleccionado  = signal<TemaApi | null>(null);

  /* Campos manual */
  temaManual      = signal('');
  enunciadoManual = signal('');

  cargarTemas(): void {
    this.cargandoTemas.set(true);
    this.errorTemas.set(false);

    this.debateService.getTemas().subscribe({
      next: (temas) => {
        this.temas.set(temas);
        this.cargandoTemas.set(false);
      },
      error: () => {
        this.errorTemas.set(true);
        this.cargandoTemas.set(false);
      }
    });
  }

  seleccionarCategoria(cat: CategoriaItem): void {
    this.categoriaActiva.set(cat);
    const filtrados = this.temas().filter(
      t => t.categoria.toLowerCase() === cat.nombre.toLowerCase()
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
    this.debateService.actualizarConfig({
      tema: { id: tema.id, enunciado: tema.enunciado, categoria: tema.categoria }
    });
  }

  temaAleatorio(): void {
    const lista = this.temasFiltrados();
    if (!lista.length) return;
    const aleatorio = lista[Math.floor(Math.random() * lista.length)];
    this.seleccionarTema(aleatorio);
  }

  temaAleatorioGlobal(): void {
    const lista = this.temas();
    if (!lista.length) return;
    const aleatorio = lista[Math.floor(Math.random() * lista.length)];
    this.categoriaActiva.set(null);
    this.seleccionarTema(aleatorio);
    /* Mostrar en qué categoría quedó para que el usuario sepa */
    const cat = this.categorias.find(
      c => c.nombre.toLowerCase() === aleatorio.categoria.toLowerCase()
    ) ?? null;
    this.categoriaActiva.set(cat);
    this.temasFiltrados.set(this.temas().filter(
      t => t.categoria.toLowerCase() === aleatorio.categoria.toLowerCase()
    ));
  }

  actualizarTemaManual(): void {
    if (this.temaManual() && this.enunciadoManual()) {
      this.debateService.actualizarConfig({
        tema: {
          enunciado: this.enunciadoManual(),
          categoria: this.temaManual(),
          manual   : true
        }
      });
    }
  }

  contarTemasPorCategoria(cat: string): number {
    return this.temas().filter(
      t => t.categoria.toLowerCase() === cat.toLowerCase()
    ).length;
  }

  /* ────────────────────────────────────────────
     PASO 4 — Postura
  ──────────────────────────────────────────── */
  setPostura(valor: string): void {
    this.debateService.actualizarConfig({
      postura: valor as 'favor' | 'contra' | 'aleatoria'
    });
  }

  /* ────────────────────────────────────────────
     PASO 5 — Configurar debate (modo + turnos)
  ──────────────────────────────────────────── */
  subturnos = signal<SubTurnoConfig[]>(
    SUBTURNOS_BASE.map(t => ({ ...t }))
  );

  setModo(valor: string): void {
    this.debateService.actualizarConfig({
      modo: valor as 'completo' | 'express'
    });
  }

  toggleSubturno(id: string): void {
    this.subturnos.update(lista =>
      lista.map(t => t.id === id ? { ...t, activo: !t.activo } : t)
    );
  }

  cambiarTiempo(id: string, delta: number): void {
    this.subturnos.update(lista =>
      lista.map(t => t.id === id
        ? { ...t, minutos: Math.min(15, Math.max(1, t.minutos + delta)) }
        : t
      )
    );
  }

  tiempoTotal = computed(() =>
    this.subturnos()
      .filter(t => t.activo)
      .reduce((acc, t) => acc + t.minutos, 0)
  );

  /* ────────────────────────────────────────────
     PASO 6 — Participantes
  ──────────────────────────────────────────── */
  setAsignado(id: string, valor: Participante): void {
    this.subturnos.update(lista =>
      lista.map(t => t.id === id ? { ...t, asignado: valor } : t)
    );
  }

  /* ────────────────────────────────────────────
     PASO 7 — Resumen
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
    const map = { completo: 'Debate completo', express: 'Debate express' };
    return map[this.config.modo] ?? '—';
  }

  textoPersonalidad(): string {
    const map = { agresiva: 'Agresiva', elegante: 'Elegante', sarcastica: 'Sarcástica' };
    return this.config.personalidad ? map[this.config.personalidad] : '—';
  }

  textoParticipantes(): string {
    const asignados = new Set(this.subturnos().filter(t => t.activo).map(t => t.asignado));
    const partes: string[] = [];
    if (asignados.has('yo'))        partes.push('Yo');
    if (asignados.has('fiera'))     partes.push('FIERA');
    if (asignados.has('companero')) partes.push('1 compañero');
    return partes.join(', ');
  }

  /* ────────────────────────────────────────────
     Navegación entre pasos
  ──────────────────────────────────────────── */
  ir(paso: number): void {
    if (paso >= 1 && paso <= 7) {
      this.pasoActivo.set(paso as PasoDebate);
    }
  }

  siguiente(): void {
    this.ir(this.pasoActivo() + 1);
  }

  volver(): void {
    this.ir(this.pasoActivo() - 1);
  }

  /* ────────────────────────────────────────────
     Iniciar debate
  ──────────────────────────────────────────── */
  iniciarDebate(): void {
    this.debateService.guardarConfig();
    this.router.navigate(['/debate']);
  }

  /* ────────────────────────────────────────────
     Helpers
  ──────────────────────────────────────────── */
  get config() { return this.debateService.config(); }

  formatearTiempo(minutos: number): string {
    return `${String(minutos).padStart(2, '0')}:00`;
  }

  ngOnInit(): void {
    this.cargarTemas();
  }
}
