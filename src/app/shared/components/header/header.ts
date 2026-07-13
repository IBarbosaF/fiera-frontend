import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/* ============================================================
   Header — Navegación global de la aplicación

   Contiene DOS navs que se alternan por breakpoint:

   ── DESKTOP (≥ 769px) ──────────────────────────────────────
   Sidebar fijo izquierdo (210px) con:
   · Logo Retorika arriba
   · 9 ítems de navegación con iconos SVG y routerLinkActive
   · Banner "Retorika Premium" → abre modal centrado
   · Sección de usuario abajo con iniciales, nombre y nivel
     · Chevron abre dropdown con opción "Cerrar sesión"
   · Botón hamburguesa (solo visible en ≤ 768px)
   · Overlay oscuro en móvil al abrir el sidebar

   ── MOBILE (≤ 768px) ───────────────────────────────────────
   Bottom bar fijo con 5 ítems:
   · Club · Progreso · Debate (elevado central) · Perfil
   · Ítem contextual: "Cerrar sesión" en Home, "Inicio" en el resto

   El componente solo se renderiza cuando hay sesión activa.
   El control @if(auth.estaLogueado()) vive en MainLayout.

   Uso: <app-header />
   Declarado en MainLayout como parte del shell global.
============================================================ */

/* ── Tipos ─────────────────────────────────────────────── */

/** Ítem de navegación del sidebar */
export interface NavItem {
  label: string;
  ruta : string;
  icono: string;
}

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

  /* ── Estado del sidebar móvil ──────────────────────────── */

  /**
   * sidebarAbierto — controla el slide del sidebar en móvil.
   * Se activa con el botón hamburguesa y se cierra con el
   * overlay, con el botón de cerrar o al navegar a una ruta.
   */
  sidebarAbierto = signal(false);


  /* ── Estado del modal Premium ──────────────────────────── */

  /**
   * modalPremiumAbierto — controla el modal centrado de
   * Retorika Premium. Se abre desde el banner del sidebar.
   * Se cierra con el botón X o clickando fuera del modal.
   */
  modalPremiumAbierto = signal(false);

  /* ── Estado derivado ───────────────────────────────────── */

  /**
   * estaEnHome — signal computado que devuelve true cuando
   * la URL actual es la raíz de la app.
   * Usado en el bottom bar mobile para mostrar "Cerrar sesión"
   * (en home) o "Inicio" (en cualquier otra página).
   *
   * Cubre las variantes con y sin HashLocationStrategy.
   */
  estaEnHome = computed(() => {
    const url = this.router.url;
    return url === '/' || url === '' || url === '/#/';
  });

  /**
   * inicialesUsuario — computed que genera las iniciales del
   * usuario a partir de nombre y apellidos para el avatar.
   * Fallback: 'U' si no hay datos de sesión.
   */
  inicialesUsuario = computed(() => {
    const u = this.auth.usuario();
    const inicial1 = u?.nombre?.charAt(0)    ?? 'U';
    const inicial2 = u?.apellidos?.charAt(0) ?? '';
    return `${inicial1}${inicial2}`;
  });

  /* ── Datos de navegación ───────────────────────────────── */

  /**
   * navItems — lista de ítems del sidebar desktop.
   * El ítem '/' usa exact: true en routerLinkActive para que
   * no quede activo en todas las rutas hijas.
   */
  readonly navItems: NavItem[] = [
    { label: 'Inicio',   ruta: '/',         icono: 'home'    },
    { label: 'Comunidad',ruta: '/comunidad',   icono: 'comunidad' },
    { label: 'Club',     ruta: '/clubs',    icono: 'club'    },
    { label: 'Retos',    ruta: '/retos',    icono: 'ligas'   },
    { label: 'Ligas',     ruta: '/ligas',    icono: 'ligas'   },
    { label: 'Ranking',  ruta: '/ranking',  icono: 'ranking' },
    { label: 'Recursos', ruta: '/recursos', icono: 'recursos'},
    { label: 'Logros',   ruta: '/logros',   icono: 'logros'  },
    { label: 'Perfil',   ruta: '/perfil',   icono: 'perfil'  },
    { label: 'Ajustes',  ruta: '/ajustes',  icono: 'ajustes' },
  ];

  /* ── Sidebar móvil ─────────────────────────────────────── */

  /** Abre o cierra el sidebar en móvil */
  toggleSidebar(): void {
    this.sidebarAbierto.update(v => !v);
  }

  /**
   * cerrarSidebar — cierra el sidebar móvil.
   * Se llama al hacer click en un ítem de nav o en el overlay.
   */
  cerrarSidebar(): void {
    this.sidebarAbierto.set(false);
  }

  /* ── Modal Premium ─────────────────────────────────────── */

  /**
   * abrirPremium — abre el modal Premium.
   * stopPropagation evita que el click propague al documento
   * y dispare el cierre inmediato del modal.
   */
  abrirPremium(event: MouseEvent): void {
    event.stopPropagation();
    this.modalPremiumAbierto.set(true);
  }

  /** Cierra el modal Premium */
  cerrarPremium(): void {
    this.modalPremiumAbierto.set(false);
  }

  /**
   * cerrarPremiumFuera — cierra el modal solo si el click
   * fue directamente sobre el overlay, no sobre el modal-card.
   */
  cerrarPremiumFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarPremium();
    }
  }

  /* ── Sesión ────────────────────────────────────────────── */

  /**
   * cerrarSesion — invalida la sesión y redirige al home.
   * Cierra también el dropdown y el sidebar si estuvieran abiertos.
   * TODO: llamar al endpoint de logout cuando el backend lo exponga.
   */
  cerrarSesion(): void {
    this.sidebarAbierto.set(false);
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }

  /**
   * irAInicio — navega programáticamente a la raíz.
   * Usado en el ítem contextual del bottom bar mobile
   * cuando el usuario está fuera del Home.
   */
  irAInicio(): void {
    this.router.navigate(['/']);
  }
}
