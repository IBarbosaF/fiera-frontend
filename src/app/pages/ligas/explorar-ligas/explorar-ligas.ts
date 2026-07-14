import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { LigaService, LigaResponse } from '../../../core/services/liga.service';

/* ============================================================
   ExplorarLigas — Listado real de ligas (GET /api/app/ligas)

   Sin mock: si el GET falla, se muestra un estado de error con
   reintento (igual que ExplorarClubs). Las ligas antiguas del
   backend (ids 1-4 en las pruebas) tienen casi todos los campos
   en null, así que TODOS los helpers de aquí son defensivos —
   nunca asumen que acceso/tipo/fechaI/etc. vienen rellenos.
============================================================ */

@Component({
  selector        : 'app-explorar-ligas',
  standalone      : true,
  imports         : [CommonModule, RouterLink, DatePipe],
  templateUrl     : './explorar-ligas.html',
  styleUrl        : './explorar-ligas.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ExplorarLigas {

  private router      = inject(Router);
  private ligaService = inject(LigaService);

  /* ── Estado ── */
  ligas    = signal<LigaResponse[]>([]);
  cargando = signal(false);
  error    = signal(false);
  busqueda = signal<string>('');

  /** Filtro activo: 'todas' | 'PUBLICA' | 'ACADEMICO' | 'CAREO' */
  filtro = signal<string>('todas');

  readonly FILTROS = [
    { valor: 'todas',      label: 'Todas'            },
    { valor: 'PUBLICA',    label: 'Abiertas'         },
    { valor: 'ACADEMICO',  label: 'Debate académico' },
    { valor: 'CAREO',      label: 'Careo'            },
  ];

  /* ── Carga inicial ── */
  ngOnInit(): void {
    this.cargarLigas();
  }

  cargarLigas(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.ligaService.listarLigas().subscribe({
      next: (ligas) => {
        this.ligas.set(ligas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  /* ── Filtrado + búsqueda combinados ── */
  ligasFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const f = this.filtro();

    return this.ligas().filter(liga => {
      const coincideBusqueda = !q
        || (liga.nombre ?? '').toLowerCase().includes(q)
        || (liga.descripcion ?? '').toLowerCase().includes(q);

      const coincideFiltro = f === 'todas'
        || liga.acceso === f
        || liga.tipo === f;

      return coincideBusqueda && coincideFiltro;
    });
  });

  totalLigas = computed(() => this.ligasFiltradas().length);

  setFiltro(valor: string): void {
    this.filtro.set(valor);
  }

  /* ── Helpers de presentación (defensivos: todo puede ser null) ── */

  imagenUrl(liga: LigaResponse): string | null {
    return this.ligaService.urlImagen(liga.imgUrl);
  }

  accesoLabel(liga: LigaResponse): string {
    const mapa: Record<string, string> = {
      PUBLICA          : 'Abierta',
      PRIVADA          : 'Privada',
      CLUBES_INVITADOS : 'Clubes invitados',
    };
    return liga.acceso ? (mapa[liga.acceso] ?? liga.acceso) : 'Sin definir';
  }

  tipoLabel(liga: LigaResponse): string {
    if (liga.tipo === 'CAREO') return 'Careo';
    if (liga.tipo === 'ACADEMICO') return 'Debate académico';
    return 'Sin definir';
  }

  papelFieraLabel(liga: LigaResponse): string {
    if (liga.papelFiera === 'JUEZ') return 'FIERA juez';
    if (liga.papelFiera === 'RIVAL') return 'Contra FIERA';
    return 'Sin definir';
  }

  /** maxParticipantes: 0 y 9999 son nuestra convención de "sin límite"
      (ver SIN_LIMITE_VALOR en liga.service.ts) */
  maxParticipantesLabel(liga: LigaResponse): string {
    if (liga.maxParticipantes == null) return 'Sin definir';
    if (liga.maxParticipantes === 0 || liga.maxParticipantes >= 9999) return 'Sin límite';
    return `${liga.maxParticipantes} participantes`;
  }

  tieneFecha(liga: LigaResponse): boolean {
    return !!liga.fechaI;
  }

  frecuenciaLabel(liga: LigaResponse): string {
    const mapa: Record<string, string> = {
      SEMANAL  : 'Semanal',
      QUINCENAL: 'Quincenal',
      MENSUAL  : 'Mensual',
    };
    return liga.debatesFrecuencia ? (mapa[liga.debatesFrecuencia] ?? liga.debatesFrecuencia) : 'Sin definir';
  }

  preguntaLabel(liga: LigaResponse): string {
    if (liga.temaElegido) return liga.temaElegido;
    if (liga.temaId) return `Tema del banco (id ${liga.temaId})`;
    return 'Aleatoria / sin definir';
  }

  /** true si la liga se puede unir directamente (sin código) */
  esAbierta(liga: LigaResponse): boolean {
    return liga.acceso === 'PUBLICA';
  }

  /** true si la liga es de datos antiguos incompletos (sin acceso/tipo definidos) */
  esIncompleta(liga: LigaResponse): boolean {
    return !liga.acceso && !liga.tipo;
  }

  /* ── Modal de detalle (ver / editar / eliminar) ── */
  ligaSeleccionada    = signal<LigaResponse | null>(null);
  confirmandoEliminar = signal(false);
  eliminando          = signal(false);
  errorEliminar       = signal('');

  verDetalle(liga: LigaResponse): void {
    this.ligaSeleccionada.set(liga);
    this.confirmandoEliminar.set(false);
    this.errorEliminar.set('');
  }

  cerrarModal(): void {
    this.ligaSeleccionada.set(null);
    this.confirmandoEliminar.set(false);
    this.errorEliminar.set('');
  }

  irAEditar(liga: LigaResponse): void {
    this.router.navigate(['/ligas/editar', liga.id]);
  }

  pedirConfirmacionEliminar(): void {
    this.confirmandoEliminar.set(true);
  }

  cancelarEliminar(): void {
    this.confirmandoEliminar.set(false);
  }

  confirmarEliminar(): void {
    const liga = this.ligaSeleccionada();
    if (!liga) return;

    this.eliminando.set(true);
    this.errorEliminar.set('');

    this.ligaService.eliminarLiga(liga.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.ligas.update(lista => lista.filter(l => l.id !== liga.id));
        this.cerrarModal();
      },
      error: () => {
        this.eliminando.set(false);
        this.errorEliminar.set('No se pudo eliminar la liga. Inténtalo de nuevo.');
      }
    });
  }

  /* ── Navegación ── */
  unirse(liga: LigaResponse): void {
    if (this.esAbierta(liga)) {
      /* TODO: llamar al backend para unirse directamente sin código
         cuando exista el endpoint. Por ahora, mock → hub de ligas. */
      this.router.navigate(['/ligas']);
    } else {
      this.router.navigate(['/ligas/unirse']);
    }
  }

  irACrear(): void {
    this.router.navigate(['/crear-liga']);
  }

  irAInicio(): void {
    this.router.navigate(['/ligas']);
  }
}
