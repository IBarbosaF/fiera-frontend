import {
  Component,
  inject,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/* ============================================================
   Header — Barra de navegación global

   Gestiona dos navbars en un único componente:

   ── DESKTOP (≥ 769px) ──────────────────────────────────────
   Bottom bar transparente centrado con 5 ítems fijos:
   Debates académicos · IA avanzada · Feedback · Progreso · Cerrar sesión
   Cada ítem lleva un icono SVG con glow azul y un tooltip de info.
   Indicador de ruta activa vía routerLinkActive.

   ── MOBILE (≤ 768px) ───────────────────────────────────────
   Bottom bar oscuro con borde superior sutil y 5 ítems:
   Club · Progreso · Debate (elevado, central) · Perfil · Inicio/Cerrar sesión
   El ítem 5 es contextual:
     - En Home  → "Cerrar sesión" (rojo)
     - En resto → "Inicio" (azul) → navega a /

   Ambos navbars solo se renderizan cuando hay sesión activa,
   controlado desde main-layout con @if(auth.estaLogueado()).

   Uso: <app-header />
   Incluido en MainLayout, fuera del router-outlet.
============================================================ */

@Component({
  selector        : 'app-header',
  standalone      : true,
  imports         : [RouterLink, RouterLinkActive],
  templateUrl     : './header.html',
  styleUrl        : './header.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Header {

  /* ── Servicios ─────────────────────────────────────────── */
  auth   = inject(AuthService);
  router = inject(Router);

  /* ── Estado derivado ───────────────────────────────────── */

  /**
   * estaEnHome — signal computado que devuelve true cuando
   * la URL actual es exactamente '/' o está vacía.
   * Se usa en el template para alternar el ítem contextual
   * del navbar mobile entre "Cerrar sesión" e "Inicio".
   *
   * Nota: router.url es un string sincrónico que Angular
   * actualiza en cada navegación; al ser leído dentro de
   * computed() se recalcula automáticamente.
   */
  estaEnHome = computed(() => {
    const url = this.router.url;
    return url === '/' || url === '' || url === '/#/';
  });

  /* ── Acciones ──────────────────────────────────────────── */

  /**
   * cerrarSesion()
   * Invalida la sesión en AuthService y redirige al home.
   * TODO: llamar al endpoint de logout cuando el backend lo exponga.
   */
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }

  /**
   * irAInicio()
   * Navega programáticamente a la raíz de la app.
   * Se usa en el ítem contextual mobile cuando el usuario
   * está en cualquier página que no sea Home.
   */
  irAInicio(): void {
    this.router.navigate(['/']);
  }

  /**
   * irAClubs()
   * Navega programáticamente a la página de clubs.
   * Se usa en el ítem contextual mobile cuando el usuario
   * está en cualquier página que no sea la de clubs.
   */
 irAClubs(): void {
  this.router.navigate(['/clubs']);
}
}
