/* ============================================================
   debate.js — Lógica de la pantalla del debate en vivo

   Flujo de turnos:
   Cada intervención (Introducción, 1ªRef, 2ªRef, Conclusión)
   tiene DOS sub-turnos: primero quien configuró el usuario,
   luego el otro. El tiempo configurado aplica a ambos.
   ENVIAR solo añade al historial, el turno avanza al acabar
   el tiempo.
============================================================ */

/* ------------------------------------------------------------
   Recuperar configuración desde localStorage
   Guardada por configDebate.js al pulsar INICIAR DEBATE
------------------------------------------------------------ */
const configGuardada = localStorage.getItem('fiera_config');
const config         = configGuardada ? JSON.parse(configGuardada) : null;

/* ------------------------------------------------------------
   Nombres legibles de cada intervención
------------------------------------------------------------ */
const NOMBRES_INTERVENCION = {
  intro     : 'Introducción',
  ref1      : '1ª Refutación',
  ref2      : '2ª Refutación',
  conclusion: 'Conclusión',
};

const ORDEN_INTERVENCIONES = ['intro', 'ref1', 'ref2', 'conclusion'];

/* ------------------------------------------------------------
   construirSecuencia()
   Genera el array completo de sub-turnos del debate.
   Cada intervención se divide en dos sub-turnos:
     - primero quien eligió el usuario en config
     - luego el contrario
   Ejemplo con Introducción configurada como "equipo":
     { nombre: 'Introducción', quien: 'equipo', duracion: 60 }
     { nombre: 'Introducción', quien: 'fiera',  duracion: 60 }
------------------------------------------------------------ */
function construirSecuencia() {
  const secuencia = [];

  ORDEN_INTERVENCIONES.forEach(id => {
    const nombre   = NOMBRES_INTERVENCION[id];
    const duracion = config?.tiempos?.[id]
      ? config.tiempos[id] * 60
      : 3 * 60; /* 3 min por defecto */

    const primero  = config?.turnos?.[id] || 'equipo';
    const segundo  = primero === 'equipo' ? 'fiera' : 'equipo';

    secuencia.push({ id, nombre, quien: primero, duracion });
    secuencia.push({ id, nombre, quien: segundo,  duracion });
  });

  return secuencia;
}

const SECUENCIA = construirSecuencia();

/* ------------------------------------------------------------
   Respuestas simuladas de FIERA
   TODO: conectar con IA real en el backend
------------------------------------------------------------ */
const RESPUESTAS_FIERA = [
  'La evidencia empírica no respalda esa afirmación de forma concluyente.',
  'Ese argumento incurre en una generalización excesiva que debilita la tesis.',
  'Desde un enfoque histórico, ese razonamiento ha demostrado ser ineficaz.',
  'Existen múltiples estudios que contradicen directamente esa premisa.',
  'La lógica de ese planteamiento contiene una falacia de falsa causalidad.',
  'Interesante perspectiva, pero omite factores estructurales determinantes.',
  'Ese razonamiento asume correlación donde no existe causalidad demostrada.',
];

/* ------------------------------------------------------------
   Estado del debate
------------------------------------------------------------ */
let subTurnoActual = 0;    /* índice en SECUENCIA */
let segundosRest   = 0;    /* segundos restantes */
let intervalTimer  = null; /* referencia al setInterval */
let pausado        = false;

/* ------------------------------------------------------------
   Referencias al DOM
------------------------------------------------------------ */
const elTurnoNombre = document.getElementById('turnoNombre');
const elTurnoBadge  = document.getElementById('turnoBadge');
const elTimerTiempo = document.getElementById('timerTiempo');
const elTimerTotal  = document.getElementById('timerTotal');
const elTimerLabel  = document.getElementById('timerTotalLabel');
const elProgress    = document.getElementById('timerProgress');
const elBtnAccion   = document.getElementById('btnAccionTurno');
const elBtnTexto    = document.getElementById('btnAccionTexto');
const elArgumento   = document.getElementById('argumentoInput');
const elHistorial   = document.getElementById('historialLista');
const elConsejo     = document.getElementById('consejoTexto');
const elModalSalir  = document.getElementById('modalSalir');
const elBtnCancelar = document.getElementById('btnCancelarSalir');
const elBtnSalir    = document.getElementById('btnSalir');

/* Circunferencia SVG (r=85): 2 * PI * 85 ≈ 534 */
const CIRCUNFERENCIA = 534;

/* ------------------------------------------------------------
   formatearSegundos(seg) → "MM:SS"
------------------------------------------------------------ */
function formatearSegundos(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ------------------------------------------------------------
   actualizarTimer()
   Refresca el SVG circular, el texto y la barra de progreso
------------------------------------------------------------ */
function actualizarTimer() {
  const sub      = SECUENCIA[subTurnoActual];
  const progreso = segundosRest / sub.duracion;
  const offset   = CIRCUNFERENCIA * (1 - progreso);

  elProgress.style.strokeDashoffset = offset;
  elTimerTiempo.textContent         = formatearSegundos(segundosRest);

  /* Rojo en los últimos 30 segundos */
  elProgress.classList.toggle('urgente', segundosRest <= 30);
}

/* ------------------------------------------------------------
   iniciarSubTurno(indice)
   Configura la UI y arranca el countdown para el sub-turno
------------------------------------------------------------ */
function iniciarSubTurno(indice) {
  if (indice >= SECUENCIA.length) {
    finalizarDebate();
    return;
  }

  subTurnoActual = indice;
  const sub      = SECUENCIA[indice];
  segundosRest   = sub.duracion;

  /* Actualizar cabecera */
  elTurnoNombre.textContent = sub.nombre;
  elTimerTotal.textContent  = `de ${formatearSegundos(sub.duracion)}`;
  if (elTimerLabel) elTimerLabel.textContent = formatearSegundos(sub.duracion);

  if (sub.quien === 'equipo') {
    /* ── TU TURNO ── */
    elTurnoBadge.textContent = 'TU TURNO';
    elTurnoBadge.classList.remove('fiera');
    elArgumento.disabled     = false;
    elArgumento.placeholder  = 'Escribe tu argumento y pulsa Enviar o Enter...';
    elBtnAccion.disabled     = false;
    elBtnTexto.textContent   = 'ENVIAR';
    elConsejo.textContent    = 'Usa el método ARE (Afirmación, Razón, Evidencia).';

  } else {
    /* ── TURNO DE FIERA ── */
    elTurnoBadge.textContent = 'TURNO DE FIERA';
    elTurnoBadge.classList.add('fiera');
    elArgumento.disabled     = true;
    elArgumento.placeholder  = 'Espera tu turno...';
    elBtnAccion.disabled     = false;
    elBtnTexto.textContent   = 'LEVANTAR MANO';
    elConsejo.textContent    = 'FIERA está argumentando. Escucha con atención.';

    /* FIERA "habla" tras 2 segundos */
    setTimeout(() => {
      const texto = RESPUESTAS_FIERA[Math.floor(Math.random() * RESPUESTAS_FIERA.length)];
      añadirAlHistorial(`${sub.nombre} — FIERA`, texto);
    }, 2000);
  }

  actualizarTimer();

  /* Arrancar countdown */
  clearInterval(intervalTimer);
  intervalTimer = setInterval(() => {
    if (pausado) return;
    segundosRest--;
    actualizarTimer();

    if (segundosRest <= 0) {
      clearInterval(intervalTimer);
      /* Pequeña pausa antes de pasar al siguiente sub-turno */
      setTimeout(() => iniciarSubTurno(subTurnoActual + 1), 800);
    }
  }, 1000);
}

/* ------------------------------------------------------------
   enviarArgumento()
   Añade el texto del input al historial y limpia el campo.
   NO cambia de turno — el turno avanza solo al acabar el tiempo.
------------------------------------------------------------ */
function enviarArgumento() {
  const sub   = SECUENCIA[subTurnoActual];
  const texto = elArgumento.value.trim();

  if (!texto || sub.quien !== 'equipo') return;

  añadirAlHistorial(`${sub.nombre} — Tú`, texto);
  elArgumento.value = '';
  elArgumento.focus();
}

/* Botón ENVIAR */
elBtnAccion?.addEventListener('click', () => {
  const sub = SECUENCIA[subTurnoActual];

  if (sub.quien === 'equipo') {
    /* Enviar argumento sin cambiar de turno */
    enviarArgumento();
  } else {
    /* LEVANTAR MANO: interrumpe el turno de FIERA */
    clearInterval(intervalTimer);
    añadirAlHistorial(`${sub.nombre} — FIERA`, '(Turno interrumpido por mano levantada)');
    setTimeout(() => iniciarSubTurno(subTurnoActual + 1), 400);
  }
});

/* Enviar también con Enter */
elArgumento?.addEventListener('keydown', e => {
  if (e.key === 'Enter') enviarArgumento();
});

/* ------------------------------------------------------------
   añadirAlHistorial(titulo, texto)
   Inserta una nueva intervención al panel del historial
------------------------------------------------------------ */
function añadirAlHistorial(titulo, texto) {
  /* Quitar mensaje inicial "aún no ha comenzado" */
  const vacio = elHistorial.querySelector('.historial-vacio');
  if (vacio) vacio.remove();

  const item = document.createElement('div');
  item.className = 'historial-item';
  item.innerHTML = `
    <span class="historial-item-titulo">${titulo}</span>
    <p class="historial-item-texto">${texto}</p>
    <button class="historial-ver-mas">Ver más</button>
  `;

  /* Expandir / colapsar texto */
  const btnVerMas = item.querySelector('.historial-ver-mas');
  const elTexto   = item.querySelector('.historial-item-texto');

  btnVerMas.addEventListener('click', () => {
    const expandido = elTexto.style.webkitLineClamp === 'unset';
    elTexto.style.webkitLineClamp = expandido ? '' : 'unset';
    elTexto.style.overflow        = expandido ? '' : 'visible';
    btnVerMas.textContent         = expandido ? 'Ver más' : 'Ver menos';
  });

  /* Insertar al principio (más reciente arriba) */
  elHistorial.prepend(item);
}

/* ------------------------------------------------------------
   finalizarDebate()
   Guarda puntuaciones simuladas y navega a resultados.html
------------------------------------------------------------ */
function finalizarDebate() {
  clearInterval(intervalTimer);
  clearTimeout(timeoutInterrupcion);

  /* Generar puntuaciones simuladas
     TODO: calcular reales según argumentos enviados */
  const resultados = {
    argumentacion: Math.floor(Math.random() * 8) + 17,
    claridad     : Math.floor(Math.random() * 8) + 16,
    refutacion   : Math.floor(Math.random() * 8) + 16,
    evidencia    : Math.floor(Math.random() * 8) + 15,
  };

  localStorage.setItem('fiera_resultados', JSON.stringify(resultados));

  /* Pequeña pausa antes de navegar para que se vea el 00:00 */
  setTimeout(() => {
    window.location.href = 'resultados.html';
  }, 800);
}

/* ------------------------------------------------------------
   Modal de salida — pausa el timer mientras está abierto
------------------------------------------------------------ */
elBtnSalir?.addEventListener('click', () => {
  pausado = true;
  clearInterval(intervalTimer);
  elModalSalir?.classList.add('activo');
});

elBtnCancelar?.addEventListener('click', () => {
  elModalSalir?.classList.remove('activo');
  pausado = false;

  /* Reanudar countdown */
  intervalTimer = setInterval(() => {
    if (pausado) return;
    segundosRest--;
    actualizarTimer();
    if (segundosRest <= 0) {
      clearInterval(intervalTimer);
      setTimeout(() => iniciarSubTurno(subTurnoActual + 1), 800);
    }
  }, 1000);
});

/* ------------------------------------------------------------
   Arrancar el debate con el primer sub-turno
   y mostrar el tema elegido en el header
------------------------------------------------------------ */
const elTurnoTema = document.getElementById('turnoTema');
if (elTurnoTema && config?.tema?.pregunta) {
  elTurnoTema.textContent = config.tema.pregunta;
} else if (elTurnoTema) {
  elTurnoTema.textContent = 'Tema libre';
}

iniciarSubTurno(0);


/* ============================================================
   LÓGICA DE INTERRUPCIONES
   
   Dos casos:
   1. FIERA levanta la mano → solo en refutaciones, turno del usuario
      Aleatorio entre 15s y (duracion-15)s del turno
   2. Tú levantas la mano → solo en turno de FIERA en refutaciones
      Al pulsar el botón LEVANTAR MANO
============================================================ */

/* Preguntas simuladas que FIERA puede hacer al interrumpir */
const PREGUNTAS_FIERA = [
  '¿Puede concretar con datos reales ese argumento que acaba de exponer?',
  '¿No contradice eso lo que afirmó en su introducción?',
  '¿Cómo respondería a los estudios que refutan directamente esa tesis?',
  '¿Está asumiendo una correlación sin demostrar causalidad?',
  '¿Qué evidencia empírica respalda específicamente ese punto?',
];

/* Respuestas de FIERA cuando el usuario le hace una pregunta */
const RESPUESTAS_A_PREGUNTA = [
  'Es una pregunta interesante, pero no altera el núcleo de mi argumento.',
  'Precisamente esa cuestión refuerza mi posición si analizamos los datos.',
  'La respuesta es compleja, pero en síntesis: los hechos me dan la razón.',
  'Agradezco la pregunta. Mi postura se sostiene incluso bajo ese supuesto.',
];

/* Referencias a los modales de interrupción */
const modalFieraLevanta      = document.getElementById('modalFieraLevanta');
const modalPreguntaFiera     = document.getElementById('modalPreguntaFiera');
const modalTuPregunta        = document.getElementById('modalTuPregunta');
const btnRechazarFiera       = document.getElementById('btnRechazarFiera');
const btnAceptarFiera        = document.getElementById('btnAceptarFiera');
const textoPreguntaFiera     = document.getElementById('textoPreguntaFiera');
const respuestaAFiera        = document.getElementById('respuestaAFiera');
const btnEnviarRespuestaFiera= document.getElementById('btnEnviarRespuestaFiera');
const tuPreguntaAFiera       = document.getElementById('tuPreguntaAFiera');
const btnCancelarTuPregunta  = document.getElementById('btnCancelarTuPregunta');
const btnEnviarTuPregunta    = document.getElementById('btnEnviarTuPregunta');

/* Referencia al timeout de interrupción de FIERA (para cancelarlo si cambia turno) */
let timeoutInterrupcion = null;

/* ------------------------------------------------------------
   esRefutacion(sub)
   Devuelve true si el sub-turno es una refutación
------------------------------------------------------------ */
function esRefutacion(sub) {
  return sub.id === 'ref1' || sub.id === 'ref2';
}

/* ------------------------------------------------------------
   programarInterrupcionFiera()
   Si estamos en refutación y es turno del usuario,
   programa una interrupción aleatoria de FIERA
   entre 15s y (duracion - 15)s del turno
------------------------------------------------------------ */
function programarInterrupcionFiera() {
  clearTimeout(timeoutInterrupcion);

  const sub = SECUENCIA[subTurnoActual];

  /* Solo en refutaciones y turno del usuario */
  if (!esRefutacion(sub) || sub.quien !== 'equipo') return;

  /* Tiempo aleatorio de interrupción */
  const minSeg = 15;
  const maxSeg = Math.max(minSeg + 5, sub.duracion - 15);
  const cuando = (Math.floor(Math.random() * (maxSeg - minSeg)) + minSeg) * 1000;

  timeoutInterrupcion = setTimeout(() => {
    /* Solo interrumpir si aún estamos en el mismo sub-turno */
    if (SECUENCIA[subTurnoActual] !== sub) return;
    abrirModalFieraLevanta();
  }, cuando);
}

/* ------------------------------------------------------------
   abrirModalFieraLevanta()
   Muestra el modal de "FIERA quiere hacerte una pregunta"
   Actualiza el badge del header
------------------------------------------------------------ */
function abrirModalFieraLevanta() {
  elTurnoBadge.textContent = 'FIERA LEVANTA LA MANO';
  elTurnoBadge.classList.add('fiera');
  modalFieraLevanta?.classList.add('activo');
}

/* RECHAZAR: cerrar modal, continuar debate sin cambios */
btnRechazarFiera?.addEventListener('click', () => {
  modalFieraLevanta?.classList.remove('activo');
  /* Restaurar badge */
  elTurnoBadge.textContent = 'TU TURNO';
  elTurnoBadge.classList.remove('fiera');
  añadirAlHistorial(`${SECUENCIA[subTurnoActual].nombre} — FIERA`, '(Solicitud de pregunta rechazada)');
});

/* ACEPTAR: cerrar modal de aviso y abrir modal con la pregunta */
btnAceptarFiera?.addEventListener('click', () => {
  modalFieraLevanta?.classList.remove('activo');

  /* Elegir pregunta aleatoria */
  const pregunta = PREGUNTAS_FIERA[Math.floor(Math.random() * PREGUNTAS_FIERA.length)];
  if (textoPreguntaFiera) textoPreguntaFiera.textContent = pregunta;

  /* Añadir pregunta de FIERA al historial */
  añadirAlHistorial(`${SECUENCIA[subTurnoActual].nombre} — FIERA pregunta`, pregunta);

  modalPreguntaFiera?.classList.add('activo');
  respuestaAFiera?.focus();
});

/* RESPONDER: enviar respuesta al historial y cerrar modal */
btnEnviarRespuestaFiera?.addEventListener('click', () => {
  const texto = respuestaAFiera?.value.trim();
  if (!texto) return;

  añadirAlHistorial(`${SECUENCIA[subTurnoActual].nombre} — Tú (respuesta)`, texto);
  if (respuestaAFiera) respuestaAFiera.value = '';

  modalPreguntaFiera?.classList.remove('activo');

  /* Restaurar badge */
  elTurnoBadge.textContent = 'TU TURNO';
  elTurnoBadge.classList.remove('fiera');
});

/* Enter para responder */
respuestaAFiera?.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnEnviarRespuestaFiera?.click();
});

/* ------------------------------------------------------------
   Tú levantas la mano — durante turno de FIERA en refutaciones
   Reemplaza la lógica anterior del botón LEVANTAR MANO
------------------------------------------------------------ */

/* Sobreescribir el listener anterior del botón de acción */
elBtnAccion?.addEventListener('click', () => {}, { once: false });

/* Nuevo listener completo que gestiona ambos casos */
elBtnAccion?.removeEventListener('click', elBtnAccion._handler);

elBtnAccion._handler = function () {
  const sub = SECUENCIA[subTurnoActual];

  if (sub.quien === 'equipo') {
    /* ENVIAR argumento — no cambia de turno */
    enviarArgumento();
  } else {
    /* LEVANTAR MANO durante turno de FIERA */
    if (esRefutacion(sub)) {
      /* En refutación: abrir modal para hacer una pregunta */
      modalTuPregunta?.classList.add('activo');
      tuPreguntaAFiera?.focus();
    } else {
      /* Fuera de refutación: comportamiento anterior (interrumpir) */
      clearInterval(intervalTimer);
      añadirAlHistorial(`${sub.nombre} — FIERA`, '(Turno interrumpido por mano levantada)');
      setTimeout(() => iniciarSubTurno(subTurnoActual + 1), 400);
    }
  }
};

elBtnAccion?.addEventListener('click', elBtnAccion._handler);

/* Cancelar tu pregunta */
btnCancelarTuPregunta?.addEventListener('click', () => {
  modalTuPregunta?.classList.remove('activo');
  if (tuPreguntaAFiera) tuPreguntaAFiera.value = '';
});

/* Enviar tu pregunta a FIERA */
btnEnviarTuPregunta?.addEventListener('click', () => {
  const pregunta = tuPreguntaAFiera?.value.trim();
  if (!pregunta) return;

  const sub = SECUENCIA[subTurnoActual];

  /* Añadir tu pregunta al historial */
  añadirAlHistorial(`${sub.nombre} — Tú pregunta`, pregunta);

  /* FIERA responde brevemente */
  const respuesta = RESPUESTAS_A_PREGUNTA[Math.floor(Math.random() * RESPUESTAS_A_PREGUNTA.length)];
  setTimeout(() => {
    añadirAlHistorial(`${sub.nombre} — FIERA responde`, respuesta);
  }, 1500);

  if (tuPreguntaAFiera) tuPreguntaAFiera.value = '';
  modalTuPregunta?.classList.remove('activo');
});

/* Enter para enviar tu pregunta */
tuPreguntaAFiera?.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnEnviarTuPregunta?.click();
});

/* ------------------------------------------------------------
   Enganchar programarInterrupcionFiera al inicio de cada
   sub-turno. Se llama desde iniciarSubTurno() añadiendo
   esta línea al final de esa función.
   Como JS no permite parchear funciones fácilmente,
   usamos un MutationObserver sobre el badge para detectar
   el cambio de turno y programar la interrupción.
------------------------------------------------------------ */
const observerTurno = new MutationObserver(() => {
  const sub = SECUENCIA[subTurnoActual];
  if (sub && esRefutacion(sub) && sub.quien === 'equipo') {
    /* Pequeño delay para que el turno esté completamente iniciado */
    setTimeout(programarInterrupcionFiera, 500);
    observerTurno.disconnect(); /* reconectar en el siguiente turno */

    /* Reconectar para el siguiente cambio */
    setTimeout(() => observerTurno.observe(elTurnoNombre, { childList: true }), 1000);
  }
});

if (elTurnoNombre) {
  observerTurno.observe(elTurnoNombre, { childList: true, subtree: true });
}