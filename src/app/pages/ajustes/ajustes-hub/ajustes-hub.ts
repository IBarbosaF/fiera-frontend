import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

/* ============================================================
   AjustesHub — Menú de entrada al módulo de Ajustes

   Grid de 6 tarjetas navegables, mismo patrón visual que
   ClubsHub. Sin lógica de backend: solo navegación.
============================================================ */
@Component({
  selector        : 'app-ajustes-hub',
  standalone      : true,
  imports         : [CommonModule],
  templateUrl     : './ajustes-hub.html',
  styleUrl        : './ajustes-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class AjustesHub {
  constructor(private router: Router) {}

  irACuenta()                    : void { this.router.navigate(['/ajustes/cuenta']); }
  irANotificacionesPrivacidad()  : void { this.router.navigate(['/ajustes/notificaciones-privacidad']); }
  irASoporte()                   : void { this.router.navigate(['/ajustes/soporte']); }
}
