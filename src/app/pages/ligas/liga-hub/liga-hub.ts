import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

/* ============================================================
   LigaHub — Menú de entrada al módulo de ligas

   Tres opciones, mismo patrón visual que ClubsHub:
   · Crear liga     → /crear-liga
   · Unirse a liga  → /ligas/unirse
   · Explorar ligas → /ligas/explorar
============================================================ */

@Component({
  selector        : 'app-liga-hub',
  standalone      : true,
  imports         : [CommonModule, RouterLink],
  templateUrl     : './liga-hub.html',
  styleUrl        : './liga-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class LigaHub {
  constructor(private router: Router) {}

  irACrear()    : void { this.router.navigate(['/crear-liga']);      }
  irAUnirse()   : void { this.router.navigate(['/ligas/unirse']);    }
  irAExplorar() : void { this.router.navigate(['/ligas/explorar']);  }
}
