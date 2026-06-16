import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Particles } from '../../shared/components/particles/particles';
import { Header } from '../../shared/components/header/header';
import { AuthService } from '../../core/services/auth.service';

/* ============================================================
   MainLayout — Shell global de la aplicación

   Estructura en desktop (≥ 769px):
   ┌──────────┬────────────────────────────────┐
   │ sidebar  │   <router-outlet />            │
   │ (Header) │   contenido de cada página     │
   └──────────┴────────────────────────────────┘

   Estructura en mobile (≤ 768px):
   ┌────────────────────────────────┐
   │   <router-outlet />            │
   │   contenido de cada página     │
   ├────────────────────────────────┤
   │   bottom bar (en Header)       │
   └────────────────────────────────┘

   Header gestiona internamente:
   · Sidebar desktop (210px fijo izquierdo)
   · Bottom bar mobile (fijo abajo)
   · Hamburguesa + overlay móvil
   · Modal Premium
   · Dropdown de usuario

   El @if(auth.estaLogueado()) controla que Header
   solo se renderice con sesión activa.
============================================================ */

@Component({
  selector    : 'app-main-layout',
  standalone  : true,
  imports     : [RouterOutlet, Particles, Header],
  templateUrl : './main-layout.html',
  styleUrl    : './main-layout.css'
})
export class MainLayout {
  auth = inject(AuthService);
}
