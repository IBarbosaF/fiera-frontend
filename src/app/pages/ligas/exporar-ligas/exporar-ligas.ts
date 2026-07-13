import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { LigaService } from '../../../core/services/liga.service';

/* ============================================================
   ExplorarLigas — Listado de ligas con filtros y búsqueda

   Datos mock (LigaService.listarLigas()) hasta que conectemos
   GET /api/app/ligas. Ver TODO en el servicio.
============================================================ */

@Component({
  selector        : 'app-explorar-ligas',
  standalone      : true,
  imports         : [CommonModule, RouterLink, DatePipe],
  templateUrl     : './exporar-ligas.html',
  styleUrl        : './exporar-ligas.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ExplorarLigas {

  private router      = inject(Router);
  private ligaService = inject(LigaService);

  /* ── Estado ── */
  ligas    = signal<any[]>([]);
  busqueda = signal<string>('');

  /** Filtro activo: 'todas' | 'publica' | 'academico' | 'careo' */
  filtro = signal<string>('todas');

  readonly FILTROS = [
    { valor: 'todas',     label: 'Todas'              },
    { valor: 'publica',   label: 'Abiertas'           },
    { valor: 'academico', label: 'Debate académico'   },
    { valor: 'careo',     label: 'Careo'              },
  ];

  /* ── Carga inicial ── */
  ngOnInit(): void {
    this.ligas.set(this.ligaService.listarLigas());
  }

  /* ── Filtrado + búsqueda combinados ── */
  ligasFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const f = this.filtro();

    return this.ligas().filter(liga => {
      const coincideBusqueda = !q
        || liga.nombre?.toLowerCase().includes(q)
        || liga.descripcion?.toLowerCase().includes(q);

      const coincideFiltro = f === 'todas'
        || liga.acceso === f
        || liga.tipoCompeticion === f;

      return coincideBusqueda && coincideFiltro;
    });
  });

  totalLigas = computed(() => this.ligasFiltradas().length);

  setFiltro(valor: string): void {
    this.filtro.set(valor);
  }

  /* ── Helpers de presentación ── */
  accesoLabel(liga: any): string {
    const mapa: Record<string, string> = {
      publica         : 'Abierta',
      privada          : 'Privada',
      clubes_invitados: 'Clubes invitados',
    };
    return mapa[liga.acceso] ?? liga.acceso;
  }

  tipoLabel(liga: any): string {
    return liga.tipoCompeticion === 'careo' ? 'Careo' : 'Debate académico';
  }

  maxParticipantesLabel(liga: any): string {
    if (liga.maxParticipantes === 'sin_limite') return 'Sin límite';
    if (liga.maxParticipantes === 'personalizado') return `${liga.maxParticipantesCustom ?? '—'} participantes`;
    return `${liga.maxParticipantes} participantes`;
  }

  /** true si la liga se puede unir directamente (sin código) */
  esAbierta(liga: any): boolean {
    return liga.acceso === 'publica';
  }

  /* ── Navegación ── */
  unirse(liga: any): void {
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
