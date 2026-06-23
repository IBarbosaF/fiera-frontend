import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   RecursosHub — Hub de recursos formativos

   Muestra 4 cards de acceso a:
   - Calendario de torneos
   - Banco de preguntas
   - Formaciones en YouTube
   - Apuntes PDF

   TODO: conectar con backend cuando haya endpoints disponibles
============================================================ */

export interface RecursoCard {
  id    : string;
  titulo: string;
  desc  : string;
  icono : string;
  color : 'blue' | 'pink' | 'green' | 'amber';
  badge : string;
  meta  : { icono: string; texto: string }[];
  cta   : string;
}

@Component({
  selector        : 'app-recursos-hub',
  standalone      : true,
  imports         : [],
  templateUrl     : './recursos-hub.html',
  styleUrl        : './recursos-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class RecursosHub {

  constructor(private router: Router) {}

  recursos: RecursoCard[] = [
    {
      id    : 'torneos',
      titulo: 'Calendario de torneos',
      desc  : 'Consulta las próximas competiciones de debate académico. Nacionales, autonómicos y universitarios.',
      icono : 'ti-calendar-event',
      color : 'blue',
      badge : '3 próximos',
      meta  : [{ icono: 'ti-map-pin', texto: 'Presencial y online' }],
      cta   : 'Ver torneos',
    },
    {
      id    : 'preguntas',
      titulo: 'Banco de preguntas',
      desc  : 'Explora los temas de debate disponibles. 50 de torneos reales y 50 generados por IA, organizados por categoría.',
      icono : 'ti-help-circle',
      color : 'pink',
      badge : '+100 temas',
      meta  : [
        { icono: 'ti-filter', texto: 'Por categoría' },
        { icono: 'ti-search', texto: 'Búsqueda'      },
      ],
      cta   : 'Explorar',
    },
    {
      id    : 'formaciones',
      titulo: 'Formaciones en YouTube',
      desc  : 'Masterclasses de debate académico, técnica oratoria y argumentación de la mano de expertos de Retorika.',
      icono : 'ti-brand-youtube',
      color : 'green',
      badge : '12 vídeos',
      meta  : [{ icono: 'ti-clock', texto: '~4h de contenido' }],
      cta   : 'Ver vídeos',
    },
    {
      id    : 'apuntes',
      titulo: 'Apuntes PDF',
      desc  : 'Guías descargables sobre estructura del debate, roles del equipo, manejo de falacias y técnicas avanzadas.',
      icono : 'ti-file-text',
      color : 'amber',
      badge : '8 guías',
      meta  : [{ icono: 'ti-download', texto: 'Descarga directa' }],
      cta   : 'Ver guías',
    },
  ];

  navegarA(id: string): void {
    this.router.navigate(['recursos', id]);
  }
}
