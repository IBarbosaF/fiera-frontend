import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/* ============================================================
   UnirseDebate — Página para unirse a un debate mediante código

   Hermano de UnirseLiga (pages/ligas/unirse-liga/) — mismo
   diseño y mismo CSS compartido (shared/styles/unirse.css),
   pero con sus propios textos y rutas de destino.

   No hay backend de códigos todavía → validarCodigo() es un mock
   que acepta cualquier código no vacío (ver TODO en el método).
============================================================ */

@Component({
  selector        : 'app-unirse-debate',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './unirse-debate.html',
  styleUrl        : './unirse-debate.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class UnirseDebate {

  private router = inject(Router);

  /* ── Textos propios de este componente ── */
  readonly TITULO         = 'Unirse a un debate';
  readonly SUBTITULO      = 'Introduce el código del debate al que quieres unirte.';
  readonly PLACEHOLDER    = 'Ej. DEB-4F7A1';
  readonly EXITO_TITULO   = '¡Te has unido al debate!';
  readonly EXITO_DESC     = 'En unos segundos entrarás a la sala del debate.';
  readonly CTA_EXITO      = 'Entrar al debate';
  readonly RUTA_EXITO     = '/partida-debate';
  readonly RUTA_EXPLORAR  = '/crear-debate';
  readonly TEXTO_EXPLORAR = '¿No tienes código? Crea tu propio debate';

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
     un endpoint de canje de códigos de debate.
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
