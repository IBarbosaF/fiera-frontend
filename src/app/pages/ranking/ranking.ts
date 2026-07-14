import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RankingService, FiltrosRanking, RankingEntry } from '../../core/services/ranking.service';

type FiltroCampo = keyof FiltrosRanking;

interface PeriodoTab {
  valor      : 'general' | 'anual' | 'mensual' | 'semanal';
  label      : string;
  disponible : boolean;
}

@Component({
  selector       : 'app-ranking',
  standalone     : true,
  imports        : [],
  templateUrl    : './ranking.html',
  styleUrl       : './ranking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ranking {

  ranking = inject(RankingService);

  /* Solo "General" tiene datos reales. El resto queda visible
     pero deshabilitado — TODO: activar cuando el backend
     trackee puntos por periodo. */
  readonly periodos: PeriodoTab[] = [
    { valor: 'general', label: 'General', disponible: true  },
    { valor: 'anual',   label: 'Anual',   disponible: false },
    { valor: 'mensual', label: 'Mensual', disponible: false },
    { valor: 'semanal', label: 'Semanal', disponible: false },
  ];

  periodoActivo = signal<PeriodoTab['valor']>('general');

  seleccionarPeriodo(p: PeriodoTab): void {
    if (!p.disponible) return; // no-op — próximamente
    this.periodoActivo.set(p.valor);
  }

  /* ── Filtro único: Tipo de institución ── */
  filtroAbierto = signal(false);

  toggleFiltro(): void {
    this.filtroAbierto.update(v => !v);
  }

  cerrarFiltro(): void {
    this.filtroAbierto.set(false);
  }

  seleccionarTipo(valor: string): void {
    const actual = this.ranking.filtros().tipoInstitucion;
    this.ranking.setFiltro('tipoInstitucion', actual === valor ? null : valor);
    this.cerrarFiltro();
  }

  hayFiltrosActivos(): boolean {
    return !!this.ranking.filtros().tipoInstitucion;
  }

  limpiarFiltros(): void {
    this.ranking.limpiarFiltros();
    this.cerrarFiltro();
  }

  /* ── Igual que antes — evita el bug de slice(3) con <3 resultados ── */
  filasSinPodio(): RankingEntry[] {
    const activo = this.ranking.rankingActivo();
    return activo.length >= 3 ? activo.slice(3) : activo;
  }

  miPosicionFueraDeLista(): boolean {
    const mia = this.ranking.miPosicion();
    return !!mia && mia.posicion > 20;
  }

  iniciales(nombre: string, apellidos: string): string {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  }
}
