import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/* ============================================================
   HeaderComponent — Barra de navegación global

   Dos estados controlados por AuthService:
   - Sin sesión : solo logo visible
   - Con sesión : logo + nav + cerrar sesión + hamburger móvil

   Uso: <app-header />
   Se incluye en main-layout para aplicar en páginas con sesión.
============================================================ */

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {

  /* Inyección del servicio de autenticación */
  auth = inject(AuthService);

  /* Estado del menú hamburger en móvil */
  menuAbierto = false;

  /* ----------------------------------------------------------
     toggleMenu()
     Abre o cierra el menú móvil
  ---------------------------------------------------------- */
  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  /* ----------------------------------------------------------
     cerrarMenu()
     Cierra el menú móvil al hacer click en un enlace
  ---------------------------------------------------------- */
  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  /* ----------------------------------------------------------
     cerrarSesion()
     Delega en AuthService y cierra el menú móvil
     TODO: notificar al backend cuando esté disponible
  ---------------------------------------------------------- */
  cerrarSesion(): void {
    this.menuAbierto = false;
    this.auth.cerrarSesion();
  }
}
