/* ============================================================
   particles.js — Partículas flotantes de fondo
   
   Crea puntos azules animados sobre un canvas fijo
   que cubre toda la pantalla. Son puramente decorativas
   y no interfieren con la interacción del usuario.
============================================================ */
(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  /* Adaptar canvas al tamaño de ventana */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  /* Crear partículas con posición y velocidad aleatorias */
  const CANTIDAD = 70;

  const particulas = Array.from({ length: CANTIDAD }, () => ({
    x    : Math.random() * window.innerWidth,
    y    : Math.random() * window.innerHeight,
    radio: Math.random() * 1.6 + 0.3,
    alpha: Math.random() * 0.45 + 0.08,
    dx   : (Math.random() - 0.5) * 0.18,
    dy   : (Math.random() - 0.5) * 0.18,
  }));

  /* Bucle de animación principal */
  function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particulas.forEach(p => {
      /* Dibujar punto */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(21, 111, 231, ${p.alpha})`;
      ctx.fill();

      /* Mover partícula */
      p.x += p.dx;
      p.y += p.dy;

      /* Rebote suave en los bordes (aparece por el lado opuesto) */
      if (p.x < 0)             p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0)             p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });

    requestAnimationFrame(dibujar);
  }

  dibujar();
})();