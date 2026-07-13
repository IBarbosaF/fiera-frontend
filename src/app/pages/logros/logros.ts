import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { LogroService } from '../../core/services/logro.service';
import { CategoriaLogro, LogroConProgreso } from '../../core/models/logro.model';

/* ============================================================
   Logros — Grid de logros con progreso, filtrable por categoría

   Todo el cálculo (progreso real vs. mock, puntos, niveles
   desbloqueados) vive en LogroService. Este componente solo
   filtra y formatea para la plantilla.
============================================================ */

interface FiltroCategoria {
  valor: CategoriaLogro | 'todas';
  label: string;
}

@Component({
  selector       : 'app-logros',
  standalone     : true,
  templateUrl    : './logros.html',
  styleUrl       : './logros.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logros {

  private logroService = inject(LogroService);

  /* ── Datos del servicio ── */
  logros              = this.logroService.logros;
  totalDesbloqueados  = this.logroService.totalDesbloqueados;
  puntosLogros        = this.logroService.puntosLogros;
  totalLogros         = computed(() => this.logros().length);

  /* ── Filtro por categoría ── */
  filtroActivo = signal<CategoriaLogro | 'todas'>('todas');

  readonly filtros: FiltroCategoria[] = [
    { valor: 'todas',      label: 'Todos'      },
    { valor: 'racha',      label: 'Racha'      },
    { valor: 'perfil',     label: 'Perfil'     },
    { valor: 'resultados', label: 'Resultados' },
    { valor: 'volumen',    label: 'Volumen'    },
    { valor: 'comunidad',  label: 'Comunidad'  },
  ];

  logrosFiltrados = computed<LogroConProgreso[]>(() => {
    const filtro = this.filtroActivo();
    const lista  = this.logros();
    return filtro === 'todas' ? lista : lista.filter(l => l.categoria === filtro);
  });

  setFiltro(valor: CategoriaLogro | 'todas'): void {
    this.filtroActivo.set(valor);
  }

  /* ----------------------------------------------------------
     progresoPorcentaje()
     % de avance hacia el siguiente nivel (no hacia el total).
     Si ya está completado, devuelve 100.
  ---------------------------------------------------------- */
  progresoPorcentaje(logro: LogroConProgreso): number {
    if (logro.completado) return 100;

    const siguiente = logro.siguienteNivel;
    if (!siguiente) return 0;

    const anterior = logro.niveles[logro.progreso.nivelDesbloqueado - 1]?.objetivo ?? 0;
    const rango    = siguiente.objetivo - anterior;
    const avance   = logro.progreso.valorActual - anterior;

    return Math.min(100, Math.max(0, Math.round((avance / rango) * 100)));
  }

  /* Texto "3 / 10" para mostrar bajo la barra de progreso */
  progresoTexto(logro: LogroConProgreso): string {
    if (logro.completado) return 'Completado';
    const objetivo = logro.siguienteNivel?.objetivo ?? 0;
    return `${logro.progreso.valorActual} / ${objetivo}`;
  }

  /* ----------------------------------------------------------
     puntosGanados()
     Suma los puntos de todos los niveles ya desbloqueados
     de un logro (relevante sobre todo para los de tramos,
     donde puede haber más de un nivel cobrado).
  ---------------------------------------------------------- */
  puntosGanados(logro: LogroConProgreso): number {
    return logro.niveles
      .filter(n => n.nivel <= logro.progreso.nivelDesbloqueado)
      .reduce((acc, n) => acc + n.puntos, 0);
  }

  /* ----------------------------------------------------------
     fechaCorta()
     Formatea fechaUltimoNivel a "12 jun 2025". Sin DatePipe
     para evitar depender del locale registrado globalmente.
  ---------------------------------------------------------- */
  fechaCorta(iso: string | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-ES', {
      day  : 'numeric',
      month: 'short',
      year : 'numeric',
    });
  }
}
