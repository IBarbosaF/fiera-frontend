import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ClubsService, Club } from './clubs.service';

export type RankingPeriodo = 'general' | 'anual' | 'mensual' | 'semanal';

export interface FiltrosRanking {
  pais?           : string | null;
  tipoInstitucion?: string | null;
}

/* Usuario mock SIN club — el club se asigna en el computed
   `dataset` a partir de los clubs reales del backend. */
interface UsuarioBaseMock {
  id       : number;
  nombre   : string;
  apellidos: string;
  username : string;
  imgPerfil: string | null;
  pais     : string;
  puntos   : Record<RankingPeriodo, number>;
}

export interface UsuarioRankingMock extends UsuarioBaseMock {
  club           : string;
  tipoInstitucion: string;
}

export interface RankingEntry {
  posicion       : number;
  usuario        : UsuarioRankingMock;
  puntos         : number;
  esUsuarioActual: boolean;
}

export type TipoInstitucionCanonico =
  | 'Universidad' | 'Colegio' | 'Instituto' | 'Club' | 'Asociación' | 'Otro';

/* ----------------------------------------------------------
   normalizarTipoInstitucion()
   El campo `institucion` del backend es texto libre (lo rellena
   quien crea el club), así que llegan variantes como
   "Colegio Mayor", "colegio", "INSTITUTO", etc. Esta función
   las reduce a una categoría fija para que el filtro funcione
   de verdad. Mismo patrón de normalización que ya usáis para
   comparar strings del backend (.trim().toLowerCase() + quitar
   diacríticos).
---------------------------------------------------------- */
function normalizarTipoInstitucion(raw: string | null | undefined): TipoInstitucionCanonico {
  if (!raw) return 'Otro';

  const limpio = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (limpio.includes('universidad')) return 'Universidad';
  if (limpio.includes('colegio'))     return 'Colegio';    // incluye "colegio mayor"
  if (limpio.includes('instituto'))   return 'Instituto';
  if (limpio.includes('asociacion'))  return 'Asociación';
  if (limpio.includes('club'))        return 'Club';
  return 'Otro';
}

const STORAGE_USUARIOS_BASE = 'fiera_ranking_mock_base';

const NOMBRES   = ['Lucía','Mateo','Sofía','Hugo','Martina','Diego','Valeria','Pablo','Elena','Iker','Carla','Marcos','Noa','Álvaro','Emma','Bruno','Vera','Rodrigo','Julia','Nico'];
const APELLIDOS = ['García','Martínez','López','Sánchez','Pérez','Gómez','Díaz','Moreno','Romero','Navarro','Torres','Ramírez','Ortiz','Vidal','Serrano'];
const PAISES    = ['España','México','Argentina','Colombia','Chile','Perú'];

@Injectable({ providedIn: 'root' })
export class RankingService {

  private auth         = inject(AuthService);
  private clubsService = inject(ClubsService);

  /* ── Clubs reales del backend ──
     Fuente de verdad para el filtro de tipo de institución
     y para asignar un club real a cada usuario mock. */
  private _clubsReales   = signal<Club[]>([]);
  private _clubsCargados = signal(false);

  cargando = computed(() => !this._clubsCargados());

  constructor() {
    this.clubsService.getClubs().subscribe({
      next: clubs => {
        this._clubsReales.set(clubs);
        this._clubsCargados.set(true);
      },
      error: () => this._clubsCargados.set(true) // no bloquear la UI si falla
    });
  }

  /* ── Usuarios base — mock persistido, sin club asignado ── */
  private _usuariosBase = signal<UsuarioBaseMock[]>(this.cargarOGenerarUsuariosBase());

  /* ── Dataset final — usuarios + club real asignado por índice.
       Vacío mientras los clubs reales no han cargado, para no
       mostrar un "sin resultados" falso durante la carga. ── */
  dataset = computed<UsuarioRankingMock[]>(() => {
    const clubs = this._clubsReales();
    if (!clubs.length) return [];

    return this._usuariosBase().map((u, i) => {
      const club = clubs[i % clubs.length];
      return {
        ...u,
        club           : club.nombre,
        tipoInstitucion: normalizarTipoInstitucion(club.institucion)
      };
    });
  });

  /* ── Estado de la vista (periodo + filtros) ── */
  private _periodo = signal<RankingPeriodo>('general');
  private _filtros = signal<FiltrosRanking>({});

  periodo = this._periodo.asReadonly();
  filtros = this._filtros.asReadonly();

  setPeriodo(p: RankingPeriodo): void {
    this._periodo.set(p);
  }

  setFiltro(campo: keyof FiltrosRanking, valor: string | null): void {
    this._filtros.update(f => ({ ...f, [campo]: valor }));
  }

  limpiarFiltros(): void {
    this._filtros.set({});
  }

  rankingActivo = computed<RankingEntry[]>(() =>
    this.construirRanking(this.dataset(), this._periodo(), this._filtros())
  );

  miPosicion = computed(() =>
    this.rankingActivo().find(e => e.esUsuarioActual) ?? null
  );

  rankingGeneralCompleto = computed<RankingEntry[]>(() =>
    this.construirRanking(this.dataset(), 'general', {})
  );

  top3General = computed<RankingEntry[]>(() =>
    this.rankingGeneralCompleto().slice(0, 3)
  );

  miPosicionGeneral = computed<RankingEntry | null>(() =>
    this.rankingGeneralCompleto().find(e => e.esUsuarioActual) ?? null
  );

  /* ── Opciones de filtro ── */
  paisesDisponibles = computed(() =>
    [...new Set(this.dataset().map(u => u.pais))].sort((a, b) => a.localeCompare(b, 'es'))
  );

  /* Tipos reales que existen en los clubs del backend.
     Si el backend aún no rellena `institucion` en algunos
     clubs, se filtran los null/vacíos. */

    tiposDisponibles = computed(() =>
      [...new Set(
        this._clubsReales().map(c => normalizarTipoInstitucion(c.institucion))
      )]
        .filter(t => t !== 'Otro')
        .sort((a, b) => a.localeCompare(b, 'es'))
    );

  private construirRanking(
    dataset: UsuarioRankingMock[],
    periodo: RankingPeriodo,
    filtros: FiltrosRanking
  ): RankingEntry[] {
    const miUsername = this.auth.usuario()?.username;

    return dataset
      .filter(u =>
        (!filtros.pais            || u.pais            === filtros.pais) &&
        (!filtros.tipoInstitucion || u.tipoInstitucion === filtros.tipoInstitucion)
      )
      .sort((a, b) => b.puntos[periodo] - a.puntos[periodo])
      .map((usuario, index) => ({
        posicion       : index + 1,
        usuario,
        puntos         : usuario.puntos[periodo],
        esUsuarioActual: usuario.username === miUsername
      }));
  }

  /* ----------------------------------------------------------
     cargarOGenerarUsuariosBase()
     Igual que antes, pero SIN club/tipoInstitucion — eso se
     asigna en el computed `dataset` a partir de clubs reales.
  ---------------------------------------------------------- */
  private cargarOGenerarUsuariosBase(): UsuarioBaseMock[] {
    const guardado = localStorage.getItem(STORAGE_USUARIOS_BASE);
    if (guardado) return JSON.parse(guardado);

    const usuarios = this.generarMock(32);
    this.incluirUsuarioActual(usuarios);
    localStorage.setItem(STORAGE_USUARIOS_BASE, JSON.stringify(usuarios));
    return usuarios;
  }

  private incluirUsuarioActual(usuarios: UsuarioBaseMock[]): void {
    const u = this.auth.usuario();
    if (!u || usuarios.some(d => d.username === u.username)) return;

    usuarios.push({
      id       : usuarios.length + 1,
      nombre   : u.nombre,
      apellidos: u.apellidos,
      username : u.username,
      imgPerfil: u.imgPerfil ?? null,
      pais     : this.aleatorio(PAISES),
      puntos   : this.puntosAleatorios()
    });
  }

  private generarMock(cantidad: number): UsuarioBaseMock[] {
    return Array.from({ length: cantidad }, (_, i) => {
      const nombre    = this.aleatorio(NOMBRES);
      const apellidos = `${this.aleatorio(APELLIDOS)} ${this.aleatorio(APELLIDOS)}`;
      return {
        id       : i + 1,
        nombre,
        apellidos,
        username : `${nombre.toLowerCase()}${apellidos.split(' ')[0].toLowerCase()}${i}`,
        imgPerfil: null,
        pais     : this.aleatorio(PAISES),
        puntos   : this.puntosAleatorios()
      };
    });
  }

  private puntosAleatorios(): Record<RankingPeriodo, number> {
    return {
      general : this.entre(400, 5000),
      anual   : this.entre(200, 3000),
      mensual : this.entre(20, 600),
      semanal : this.entre(0, 150)
    };
  }

  private aleatorio<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private entre(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
