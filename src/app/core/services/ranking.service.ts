import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService, Usuario } from './auth.service';

const API_BASE = 'https://fiera.retorika.es';

export type RankingPeriodo = 'general' | 'anual' | 'mensual' | 'semanal';

export interface FiltrosRanking {
  tipoInstitucion?: string | null;
}

export interface RankingEntry {
  posicion       : number;
  usuario        : Usuario;
  puntos         : number;
  club           : string;
  tipoInstitucion: string;
  esUsuarioActual: boolean;
}

/* ----------------------------------------------------------
   normalizarTipoInstitucion()
   El campo institucion del club es texto libre ("Colegio Mayor"
   vs "Colegio", mayúsculas/tildes inconsistentes). Se reduce a
   una categoría fija para que el filtro funcione de verdad.
---------------------------------------------------------- */
function normalizarTipoInstitucion(raw: string | null | undefined): string {
  if (!raw) return 'Otro';
  const limpio = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (limpio.includes('universidad')) return 'Universidad';
  if (limpio.includes('colegio'))     return 'Colegio';    // incluye "colegio mayor"
  if (limpio.includes('instituto'))   return 'Instituto';
  if (limpio.includes('asociacion'))  return 'Asociación';
  if (limpio.includes('club'))        return 'Club';
  return 'Otro';
}

@Injectable({ providedIn: 'root' })
export class RankingService {

  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /* ── Usuarios reales — GET /api/app/usuarios ──
     Mismo endpoint que ya usa AuthService.login() para
     encontrar el usuario por email. El interceptor HTTP
     adjunta el Bearer token automáticamente. */
  private _usuarios = signal<Usuario[]>([]);
  private _cargando = signal(true);
  private _error    = signal(false);

  cargando = this._cargando.asReadonly();
  error    = this._error.asReadonly();

  constructor() {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this._cargando.set(true);
    this._error.set(false);

    this.http.get<Usuario[]>(`${API_BASE}/api/app/usuarios`).subscribe({
      next: usuarios => {
        this._usuarios.set(usuarios);
        this._cargando.set(false);
      },
      error: () => {
        this._error.set(true);
        this._cargando.set(false);
      }
    });
  }

  /* ── Filtros — solo Tipo de institución.
     País se descarta: el campo existe en Club.pais pero casi
     siempre viene null desde el backend (ver swagger), así que
     el filtro no sería útil todavía. TODO: reactivar cuando el
     backend rellene ese dato de forma consistente. ── */
  private _filtros = signal<FiltrosRanking>({});
  filtros = this._filtros.asReadonly();

  setFiltro(campo: keyof FiltrosRanking, valor: string | null): void {
    this._filtros.update(f => ({ ...f, [campo]: valor }));
  }

  limpiarFiltros(): void {
    this._filtros.set({});
  }

  /* ----------------------------------------------------------
     construirRanking()
     Toma el primer club de cada usuario (usuario.clubs[0]) para
     sacar nombre + tipo. Un usuario sin clubs cae en "Sin club".
  ---------------------------------------------------------- */
  private construirRanking(usuarios: Usuario[], filtros: FiltrosRanking): RankingEntry[] {
    const miUsername = this.auth.usuario()?.username;

    return usuarios
      .map(u => {
        const club = u.clubs?.[0] ?? null;
        return {
          usuario        : u,
          puntos         : u.puntos ?? 0,
          club           : club?.nombre ?? 'Sin club',
          tipoInstitucion: normalizarTipoInstitucion(club?.institucion)
        };
      })
      .filter(e => !filtros.tipoInstitucion || e.tipoInstitucion === filtros.tipoInstitucion)
      .sort((a, b) => b.puntos - a.puntos)
      .map((e, index) => ({
        posicion       : index + 1,
        ...e,
        esUsuarioActual: e.usuario.username === miUsername
      }));
  }

  /* ── Ranking activo — único periodo real: General.
     Anual/Mensual/Semanal quedan "próximamente" en el
     componente hasta que el backend trackee puntos por periodo. ── */
  rankingActivo = computed<RankingEntry[]>(() =>
    this.construirRanking(this._usuarios(), this._filtros())
  );

  miPosicion = computed(() =>
    this.rankingActivo().find(e => e.esUsuarioActual) ?? null
  );

  /* ── Sin filtros — fuente única para el widget de Home ── */
  rankingGeneralCompleto = computed<RankingEntry[]>(() =>
    this.construirRanking(this._usuarios(), {})
  );

  top3General = computed<RankingEntry[]>(() =>
    this.rankingGeneralCompleto().slice(0, 3)
  );

  miPosicionGeneral = computed<RankingEntry | null>(() =>
    this.rankingGeneralCompleto().find(e => e.esUsuarioActual) ?? null
  );

  /* ── Opciones de filtro — tipos reales presentes entre
       los clubs de los usuarios cargados ── */
  tiposDisponibles = computed(() =>
    [...new Set(this.rankingGeneralCompleto().map(e => e.tipoInstitucion))]
      .filter(t => t !== 'Otro')
      .sort((a, b) => a.localeCompare(b, 'es'))
  );
}
