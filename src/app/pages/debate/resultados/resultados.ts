import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DebateService } from '../../../core/services/debate.service';

/* ============================================================
   ResultadosComponent — Pantalla de resultados del debate

   Muestra las puntuaciones reales generadas por el backend
   al finalizar el debate, con animaciones de contador y
   círculo SVG. Incluye modal con el feedback textual completo.
============================================================ */

/* Circunferencia SVG (r=68): 2 * PI * 68 ≈ 427 */
const CIRCUNFERENCIA = 427;

@Component({
  selector        : 'app-resultados',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './resultados.html',
  styleUrl        : './resultados.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Resultados implements OnInit {

  debateService = inject(DebateService);

  /* ── Puntuaciones animadas ── */
  argumentacion = signal(0);
  claridad      = signal(0);
  refutacion    = signal(0);
  evidencia     = signal(0);
  total         = signal(0);

  /* ── SVG círculo ── */
  svgOffset = signal(CIRCUNFERENCIA);

  /* ── Mensaje motivacional + feedback real ── */
  mensaje  = signal('');
  feedback = signal('');

  /* ── Modal de detalle ── */
  modalDetalleAbierto = signal(false);

  /* ── Estado: hay resultados reales o no ── */
  sinResultados = signal(false);

  /* ----------------------------------------------------------
     ngOnInit — Cargar resultados reales del backend y
     arrancar animaciones
  ---------------------------------------------------------- */
  ngOnInit(): void {
    const resultado = this.debateService.obtenerResultadoUsuario();

    if (!resultado) {
      this.sinResultados.set(true);
      this.mensaje.set('No se encontraron resultados para este debate.');
      return;
    }

    this.feedback.set(resultado.feedback ?? '');
    this.mensaje.set(this.obtenerMensaje(resultado.scoreTotal));

    /* Animar tras un pequeño delay para que la entrada sea suave */
    setTimeout(() => {
      this.animarNumero(this.argumentacion, resultado.scoreArgumentacion, 1200);
      this.animarNumero(this.claridad,      resultado.scoreClarity,       1200);
      this.animarNumero(this.refutacion,    resultado.scoreRefutacion,    1200);
      this.animarNumero(this.evidencia,     resultado.scoreEvidence,      1200);
      this.animarNumero(this.total,         resultado.scoreTotal,         1500);
      this.animarCirculo(resultado.scoreTotal);
    }, 300);
  }

  /* ----------------------------------------------------------
     animarNumero(signal, valorFinal, duracion)
     Anima un contador del 0 al valor final con ease-out
  ---------------------------------------------------------- */
  private animarNumero(
    sig     : ReturnType<typeof signal<number>>,
    final   : number,
    duracion: number
  ): void {
    const inicio = performance.now();
    const frame  = (ahora: number) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      const ease     = 1 - Math.pow(1 - progreso, 3);
      sig.set(Math.round(ease * final));
      if (progreso < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------
     animarCirculo(valorFinal)
     Anima el stroke-dashoffset del SVG circular
  ---------------------------------------------------------- */
  private animarCirculo(valorFinal: number): void {
    const inicio  = performance.now();
    const duracion = 1500;
    const frame   = (ahora: number) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      const ease     = 1 - Math.pow(1 - progreso, 3);
      const offset   = CIRCUNFERENCIA * (1 - (ease * valorFinal / 100));
      this.svgOffset.set(offset);
      if (progreso < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------
     obtenerMensaje(puntuacion)
     Devuelve mensaje motivacional según la puntuación total
  ---------------------------------------------------------- */
  private obtenerMensaje(puntuacion: number): string {
    if (puntuacion >= 90) return '¡Excepcional! Dominas el arte del debate. Eres una verdadera fiera.';
    if (puntuacion >= 75) return 'Muy buen trabajo. Sigue practicando para alcanzar el siguiente nivel.';
    if (puntuacion >= 60) return 'Buen esfuerzo. Trabaja tu argumentación y verás grandes mejoras.';
    return 'Cada debate te hace más fuerte. ¡No te rindas, sigue entrenando!';
  }

  /* ----------------------------------------------------------
     verDetalle() / cerrarDetalle()
     Abre/cierra el modal con el feedback completo de FIERA
  ---------------------------------------------------------- */
  verDetalle(): void {
    if (!this.feedback()) return;
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
  }
}
