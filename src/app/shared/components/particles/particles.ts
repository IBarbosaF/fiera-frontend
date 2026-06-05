import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

/* ============================================================
   ParticlesComponent — Fondo animado de partículas

   Crea puntos azules flotantes sobre un canvas fijo
   que cubre toda la pantalla. Puramente decorativo.

   Uso: <app-particles />
   Se incluye en los layouts para aplicar en todas las páginas.
============================================================ */

@Component({
  selector: 'app-particles',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`
    canvas {
      position      : fixed;
      inset         : 0;
      width         : 100%;
      height        : 100%;
      pointer-events: none;
      z-index       : 0;
    }
  `]
})
export class Particles implements AfterViewInit, OnDestroy {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!        : CanvasRenderingContext2D;
  private animFrameId : number = 0;
  private particulas  : Particula[] = [];
  private readonly CANTIDAD = 70;

  /* ----------------------------------------------------------
     ngAfterViewInit()
     Se ejecuta cuando el canvas está disponible en el DOM
  ---------------------------------------------------------- */
  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx     = canvas.getContext('2d')!;

    this.ajustarTamano();
    this.crearParticulas();
    this.animar();

    /* Actualizar tamaño del canvas al redimensionar ventana */
    window.addEventListener('resize', this.ajustarTamano.bind(this));
  }

  /* ----------------------------------------------------------
     ngOnDestroy()
     Limpia el animation frame y el listener al destruir
     el componente para evitar memory leaks
  ---------------------------------------------------------- */
  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.ajustarTamano.bind(this));
  }

  /* ----------------------------------------------------------
     ajustarTamano()
     Adapta el canvas al tamaño actual de la ventana
  ---------------------------------------------------------- */
  private ajustarTamano(): void {
    const canvas  = this.canvasRef.nativeElement;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /* ----------------------------------------------------------
     crearParticulas()
     Genera el array de partículas con posición y
     velocidad aleatorias
  ---------------------------------------------------------- */
  private crearParticulas(): void {
    this.particulas = Array.from({ length: this.CANTIDAD }, () => ({
      x    : Math.random() * window.innerWidth,
      y    : Math.random() * window.innerHeight,
      radio: Math.random() * 1.6 + 0.3,
      alpha: Math.random() * 0.45 + 0.08,
      dx   : (Math.random() - 0.5) * 0.18,
      dy   : (Math.random() - 0.5) * 0.18,
    }));
  }

  /* ----------------------------------------------------------
     animar()
     Bucle principal de animación con requestAnimationFrame
  ---------------------------------------------------------- */
  private animar(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.particulas.forEach(p => {
      /* Dibujar partícula */
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(21, 111, 231, ${p.alpha})`;
      this.ctx.fill();

      /* Mover partícula */
      p.x += p.dx;
      p.y += p.dy;

      /* Rebote en bordes: aparece por el lado opuesto */
      if (p.x < 0)             p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0)             p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });

    this.animFrameId = requestAnimationFrame(this.animar.bind(this));
  }
}

/* ----------------------------------------------------------
   Interfaz de partícula
---------------------------------------------------------- */
interface Particula {
  x    : number;
  y    : number;
  radio: number;
  alpha: number;
  dx   : number;
  dy   : number;
}
