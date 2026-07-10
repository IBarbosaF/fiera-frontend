import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

/* ============================================================
   AjustesSoporte — Contacto, sugerencias, reportes y,
   dentro del tab "Legal", términos/privacidad.

   Formulario de contacto: 100% mock, no hay endpoint de
   soporte/tickets todavía.
   TODO: reemplazar el envío mock por una llamada real
   cuando exista el endpoint (ej. POST /api/app/soporte).
============================================================ */

const EMAIL_SOPORTE = 'soporte@retorika.es';

@Component({
  selector       : 'app-ajustes-soporte',
  standalone     : true,
  imports        : [],
  templateUrl    : './ajustes-soporte.html',
  styleUrl       : './ajustes-soporte.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AjustesSoporte {

  readonly emailSoporte = EMAIL_SOPORTE;

  constructor(private router: Router) {}

  irAAjustes(): void {
    this.router.navigate(['/ajustes']);
  }

  /* ══════════════════════════════════════════
     TABS
  ══════════════════════════════════════════ */
  tabActiva = signal<'ayuda' | 'legal'>('ayuda');

  /* ══════════════════════════════════════════
     FORMULARIO DE CONTACTO — mock
  ══════════════════════════════════════════ */
  tipoSolicitud = signal<'sugerencia' | 'reporte' | 'otro'>('sugerencia');
  asunto        = signal('');
  mensaje       = signal('');
  errorForm     = signal('');
  exitoForm     = signal(false);
  enviando      = signal(false);

  enviarSolicitud(): void {
    if (!this.asunto().trim() || !this.mensaje().trim()) {
      this.errorForm.set('Completa el asunto y el mensaje.');
      return;
    }

    this.errorForm.set('');
    this.exitoForm.set(false);
    this.enviando.set(true);

    // TODO: reemplazar con llamada real al backend (POST /api/app/soporte)
    console.log('📨 Solicitud de soporte (mock):', {
      tipo   : this.tipoSolicitud(),
      asunto : this.asunto(),
      mensaje: this.mensaje(),
    });

    setTimeout(() => {
      this.enviando.set(false);
      this.exitoForm.set(true);
      this.asunto.set('');
      this.mensaje.set('');
    }, 600);
  }

  /* ══════════════════════════════════════════
     LEGAL — acordeón
  ══════════════════════════════════════════ */
  legalAbierto = signal<'terminos' | 'privacidad' | null>(null);

  toggleLegal(seccion: 'terminos' | 'privacidad'): void {
    this.legalAbierto.update(actual => actual === seccion ? null : seccion);
  }
}
