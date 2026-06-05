import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DebateService } from '../../core/services/debate.service';

/* ============================================================
   ResultadosComponent — Pantalla de resultados del debate

   Muestra las puntuaciones del debate finalizado con
   animaciones de contador y círculo SVG.

   TODO: obtener puntuaciones reales del backend cuando
         esté disponible en lugar de las simuladas.
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

  /* ── Mensaje motivacional ── */
  mensaje = signal('');

  /* ----------------------------------------------------------
     ngOnInit — Cargar resultados y arrancar animaciones
     TODO: obtener resultados del backend cuando esté listo
  ---------------------------------------------------------- */
  ngOnInit(): void {
    const resultados = this.debateService.obtenerResultados();

    const vals = resultados ?? {
      argumentacion: Math.floor(Math.random() * 8) + 17,
      claridad     : Math.floor(Math.random() * 8) + 16,
      refutacion   : Math.floor(Math.random() * 8) + 16,
      evidencia    : Math.floor(Math.random() * 8) + 15,
    };

    const totalVal = vals.argumentacion + vals.claridad
                   + vals.refutacion   + vals.evidencia;

    this.mensaje.set(this.obtenerMensaje(totalVal));

    /* Animar tras un pequeño delay para que la entrada sea suave */
    setTimeout(() => {
      this.animarNumero(this.argumentacion, vals.argumentacion, 1200);
      this.animarNumero(this.claridad,      vals.claridad,      1200);
      this.animarNumero(this.refutacion,    vals.refutacion,    1200);
      this.animarNumero(this.evidencia,     vals.evidencia,     1200);
      this.animarNumero(this.total,         totalVal,           1500);
      this.animarCirculo(totalVal);
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
     verDetalle()
     TODO: navegar a página de detalle cuando esté disponible
  ---------------------------------------------------------- */
  verDetalle(): void {
    alert('Próximamente: análisis detallado de tu debate.');
  }
}
