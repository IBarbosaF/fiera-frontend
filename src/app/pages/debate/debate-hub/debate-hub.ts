import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   DebateHub — Pantalla de selección de modo de debate
============================================================ */

@Component({
  selector        : 'app-debate-hub',
  standalone      : true,
  imports         : [],
  templateUrl     : './debate-hub.html',
  styleUrl        : './debate-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class DebateHub {

  router = inject(Router);

  readonly modos = [
    {
      ruta     : 'debate-configurar',
      icono    : 'ti-settings',
      titulo   : 'Configurar debate',
      desc     : 'Elige el tema, la postura, la personalidad de FIERA y los turnos. Control total sobre tu entrenamiento.',
      tags     : ['Personalizable', '7 pasos', 'Con compañeros'],
      color    : 'azul',
      destacada: true
    },
    {
      ruta     : 'debate-rapido',
      icono    : 'ti-bolt',
      titulo   : 'Debate rápido',
      desc     : 'FIERA elige el tema y la dificultad. Empieza a debatir en segundos sin configuración previa.',
      tags     : ['Instantáneo', 'Aleatorio'],
      color    : 'verde',
      destacada: false
    },
    {
      ruta     : 'debate-unirse',
      icono    : 'ti-users',
      titulo   : 'Unirme a un debate',
      desc     : 'Introduce el código de sesión que te ha compartido un compañero para unirte a su debate.',
      tags     : ['Con código', 'Multijugador'],
      color    : 'fucsia',
      destacada: false
    }
  ];

  navegar(ruta: string): void {
    this.router.navigate([ruta]);
  }
}
