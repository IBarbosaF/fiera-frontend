// src/app/pages/ranking/ranking.ts
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  RankingService,
  RankingPeriodo,
  FiltrosRanking
} from '../../core/services/ranking.service';

/* ============================================================
   Ranking — Vista completa de ranking de usuarios

   Consume RankingService (mock, singleton), que es la MISMA
   fuente de datos que usa el widget de Home. Cambiar periodo
   o filtros aquí no afecta al preview de Home, que siempre
   muestra el ranking general sin filtrar.
============================================================ */

type FiltroCampo = keyof FiltrosRanking;

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

  /* ── Definición de pestañas de periodo ── */
  readonly periodos: { valor: RankingPeriodo; label: string }[] = [
    { valor: 'general', label: 'General' },
    { valor: 'anual',   label: 'Anual'   },
    { valor: 'mensual', label: 'Mensual' },
    { valor: 'semanal', label: 'Semanal' },
  ];

  /* ── Definición de filtros — cada uno apunta a su campo
       en FiltrosRanking y a su lista de opciones en el service ── */
  readonly filtrosConfig: { campo: FiltroCampo; label: string }[] = [
    { campo: 'pais',            label: 'País' },
    { campo: 'tipoInstitucion', label: 'Tipo' },
  ];

  /* ── Estado local — qué dropdown de filtro está abierto ──
     Solo uno a la vez, por eso es un único signal en vez de
     un mapa de booleans. */
  filtroAbierto = signal<FiltroCampo | null>(null);

  /* ----------------------------------------------------------
     seleccionarPeriodo()
  ---------------------------------------------------------- */
  seleccionarPeriodo(p: RankingPeriodo): void {
    this.ranking.setPeriodo(p);
  }

  /* ----------------------------------------------------------
     toggleFiltro()
     Abre el dropdown del campo indicado; si ya estaba abierto,
     lo cierra. Cerrar uno abre el otro automáticamente.
  ---------------------------------------------------------- */
  toggleFiltro(campo: FiltroCampo): void {
    this.filtroAbierto.update(actual => actual === campo ? null : campo);
  }

  cerrarFiltros(): void {
    this.filtroAbierto.set(null);
  }

  /* ----------------------------------------------------------
     seleccionarValorFiltro()
     Aplica el valor elegido y cierra el dropdown. Si se
     selecciona el mismo valor ya activo, actúa como toggle
     (lo desactiva) — mismo patrón que filtro-btn en registro.
  ---------------------------------------------------------- */
  seleccionarValorFiltro(campo: FiltroCampo, valor: string): void {
    const actual = this.ranking.filtros()[campo];
    this.ranking.setFiltro(campo, actual === valor ? null : valor);
    this.cerrarFiltros();
  }

  /* ----------------------------------------------------------
     opcionesPara()
     Devuelve la lista de opciones disponibles para un campo
     de filtro concreto, leyendo del computed correspondiente
     en el service.
  ---------------------------------------------------------- */
  opcionesPara(campo: FiltroCampo): string[] {
    switch (campo) {
      case 'pais':            return this.ranking.paisesDisponibles();
      case 'tipoInstitucion': return this.ranking.tiposDisponibles();
    }
  }

  /* ----------------------------------------------------------
     hayFiltrosActivos()
     True si al menos un filtro tiene valor — controla si se
     muestra el botón "Limpiar filtros".
  ---------------------------------------------------------- */
  hayFiltrosActivos(): boolean {
    const f = this.ranking.filtros();
    return !!(f.pais || f.tipoInstitucion);
  }

  limpiarFiltros(): void {
    this.ranking.limpiarFiltros();
    this.cerrarFiltros();
  }

  /* ----------------------------------------------------------
     miPosicionFueraDeLista()
     True cuando el usuario actual no está entre las primeras
     N filas visibles — para decidir si mostramos su fila
     "flotante" al fondo, además de en su sitio en la lista.
     N se deja en 20 como umbral razonable de "lista visible".
  ---------------------------------------------------------- */
  miPosicionFueraDeLista(): boolean {
    const mia = this.ranking.miPosicion();
    return !!mia && mia.posicion > 20;
  }

  iniciales(nombre: string, apellidos: string): string {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  }
}
