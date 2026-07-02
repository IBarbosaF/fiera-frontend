import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/* ============================================================
   UnirseLiga — Página para unirse a una liga mediante código

   Vive dentro de MainLayout (tiene sidebar), ruta: /ligas/unirse

   Hermano de UnirseDebate (pages/debate/unirse-debate/) — mismo
   diseño y mismo CSS compartido (shared/styles/unirse.css),
   pero cada uno con sus propios textos y rutas de destino.

   No hay backend de códigos todavía → validarCodigo() es un mock
   que acepta cualquier código no vacío (ver TODO en el método).
============================================================ */

@Component({
  selector        : 'app-unirse-liga',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './unirse-liga.html',
  styleUrl        : './unirse-liga.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class UnirseLiga {

  private router = inject(Router);

  /* ── Textos propios de este componente ── */
  readonly TITULO         = 'Unirse a una liga';
  readonly SUBTITULO      = 'Introduce el código de invitación que te ha compartido el organizador.';
  readonly PLACEHOLDER    = 'Ej. LIGA-XK92B';
  readonly EXITO_TITULO   = '¡Te has unido a la liga!';
  readonly EXITO_DESC     = 'Ya formas parte de la liga. Podrás ver tus próximos debates desde el hub de ligas.';
  readonly CTA_EXITO      = 'Ir a mis ligas';
  readonly RUTA_EXITO     = '/ligas';
  readonly RUTA_EXPLORAR  = '/ligas';
  readonly TEXTO_EXPLORAR = '¿No tienes código? Explora ligas públicas';

  /* ── Estado del formulario ── */
  codigo   = signal('');
  cargando = signal(false);
  error    = signal('');
  exito    = signal(false);

  setCodigo(valor: string): void {
    this.codigo.set(valor.toUpperCase());
    if (this.error()) this.error.set('');
  }

  /* ----------------------------------------------------------
     validarCodigo()
     TODO: reemplazar por llamada real al backend cuando exista
     un endpoint de canje de códigos de liga.
     Por ahora: mock — cualquier código no vacío es válido.
  ---------------------------------------------------------- */
  validarCodigo(): void {
    this.error.set('');

    if (!this.codigo().trim()) {
      this.error.set('Introduce un código para continuar.');
      return;
    }

    this.cargando.set(true);

    /* Simula latencia de red para que el estado "cargando" se note */
    setTimeout(() => {
      this.cargando.set(false);
      this.exito.set(true);
    }, 600);
  }

  continuar(): void {
    this.router.navigate([this.RUTA_EXITO]);
  }
}
