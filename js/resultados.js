/* ============================================================
   resultados.js — Lógica de la pantalla de resultados

   Lee la puntuación guardada por debate.js en localStorage
   y anima los valores en pantalla.
   Las puntuaciones son simuladas hasta conectar con backend.
============================================================ */

/* ------------------------------------------------------------
   Recuperar puntuaciones desde localStorage
   Si no existen, generar valores simulados
------------------------------------------------------------ */
const resultadosGuardados = localStorage.getItem('fiera_resultados');
const resultados = resultadosGuardados
  ? JSON.parse(resultadosGuardados)
  : {
      argumentacion: Math.floor(Math.random() * 8) + 17, /* 17-25 */
      claridad     : Math.floor(Math.random() * 8) + 16, /* 16-24 */
      refutacion   : Math.floor(Math.random() * 8) + 16,
      evidencia    : Math.floor(Math.random() * 8) + 15,
    };

const total = resultados.argumentacion
  + resultados.claridad
  + resultados.refutacion
  + resultados.evidencia;

/* ------------------------------------------------------------
   Mensajes motivacionales según puntuación total
------------------------------------------------------------ */
function obtenerMensaje(puntuacion) {
  if (puntuacion >= 90) return '¡Excepcional! Dominas el arte del debate. Eres una verdadera fiera.';
  if (puntuacion >= 75) return 'Muy buen trabajo. Sigue practicando para alcanzar el siguiente nivel.';
  if (puntuacion >= 60) return 'Buen esfuerzo. Trabaja tu argumentación y verás grandes mejoras.';
  return 'Cada debate te hace más fuerte. ¡No te rindas, sigue entrenando!';
}

/* ------------------------------------------------------------
   animarNumero(elemento, valorFinal, duracion)
   Anima un contador del 0 al valor final
------------------------------------------------------------ */
function animarNumero(elemento, valorFinal, duracion) {
  if (!elemento) return;
  const inicio   = performance.now();
  const frame    = (ahora) => {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    const ease     = 1 - Math.pow(1 - progreso, 3); /* ease-out cúbico */
    elemento.textContent = Math.round(ease * valorFinal);
    if (progreso < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------
   animarCirculo(elemento, valorFinal, maximo, circunferencia)
   Anima el stroke-dashoffset del SVG circular
------------------------------------------------------------ */
function animarCirculo(elemento, valorFinal, maximo, circunferencia) {
  if (!elemento) return;
  const inicio   = performance.now();
  const duracion = 1500;
  const frame    = (ahora) => {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    const ease     = 1 - Math.pow(1 - progreso, 3);
    const offset   = circunferencia * (1 - (ease * valorFinal / maximo));
    elemento.style.strokeDashoffset = offset;
    if (progreso < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------
   Inicialización: rellenar y animar todos los valores
   con un pequeño delay para que la entrada sea suave
------------------------------------------------------------ */
window.addEventListener('DOMContentLoaded', () => {
  /* Mensaje motivacional */
  const elMensaje = document.getElementById('mensajeMotivacional');
  if (elMensaje) elMensaje.textContent = obtenerMensaje(total);

  /* Delay inicial para que la animación se vea al entrar */
  setTimeout(() => {

    /* Animar métricas individuales */
    animarNumero(document.getElementById('val-argumentacion'), resultados.argumentacion, 1200);
    animarNumero(document.getElementById('val-claridad'),      resultados.claridad,      1200);
    animarNumero(document.getElementById('val-refutacion'),    resultados.refutacion,    1200);
    animarNumero(document.getElementById('val-evidencia'),     resultados.evidencia,     1200);

    /* Animar total */
    animarNumero(document.getElementById('puntuacionTotal'), total, 1500);

    /* Animar círculo SVG (circunferencia r=68: ≈427) */
    animarCirculo(document.getElementById('puntuacionProgress'), total, 100, 427);

  }, 300);
});

/* ------------------------------------------------------------
   Botón VER DETALLE — por ahora muestra el historial
   TODO: conectar con página de detalle completo
------------------------------------------------------------ */
document.getElementById('btnVerDetalle')?.addEventListener('click', () => {
  alert('Próximamente: análisis detallado de tu debate.');
});