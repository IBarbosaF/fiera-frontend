/* ============================================================
   configDebates.js — Lógica de la página de configuración de debate

   Gestiona:
   - Navegación entre secciones del sidebar
   - Controles de tiempo (sumar/restar minutos)
   - Selección de opciones en grupos de botones
   - Estado de la configuración del debate
============================================================ */

/* ------------------------------------------------------------
   Estado inicial del debate
   Se actualiza conforme el usuario configura opciones
------------------------------------------------------------ */
const estadoDebate = {
  tiempos: {
    intro     : 3,   /* minutos */
    ref1      : 4,
    ref2      : 5,
    conclusion: 3,
  },
  dificultad: 'medio',
  modo      : 'completo',
  postura   : 'aleatoria',
};

/* Mínimo y máximo de minutos por intervención */
const MIN_MINUTOS = 1;
const MAX_MINUTOS = 15;

/* ------------------------------------------------------------
   formatearTiempo(minutos)
   Convierte un número de minutos a formato "MM:00"
------------------------------------------------------------ */
function formatearTiempo(minutos) {
  return `${String(minutos).padStart(2, '0')}:00`;
}

/* ------------------------------------------------------------
   actualizarVisualizacionTiempos()
   Refresca todos los valores de tiempo en pantalla
------------------------------------------------------------ */
function actualizarVisualizacionTiempos() {
  Object.keys(estadoDebate.tiempos).forEach(campo => {
    const el = document.getElementById(`val-${campo}`);
    if (el) el.textContent = formatearTiempo(estadoDebate.tiempos[campo]);
  });
}

/* ------------------------------------------------------------
   Delegación de eventos en los botones de tiempo (− y +)
   Se escucha en el contenedor padre para eficiencia
------------------------------------------------------------ */
document.querySelector('.tiempo-lista')?.addEventListener('click', e => {
  const btn = e.target.closest('.btn-tiempo');
  if (!btn) return;

  const campo  = btn.dataset.campo;
  const accion = btn.dataset.accion;

  if (!campo || !estadoDebate.tiempos.hasOwnProperty(campo)) return;

  if (accion === 'sumar'  && estadoDebate.tiempos[campo] < MAX_MINUTOS) {
    estadoDebate.tiempos[campo]++;
  }
  if (accion === 'restar' && estadoDebate.tiempos[campo] > MIN_MINUTOS) {
    estadoDebate.tiempos[campo]--;
  }

  actualizarVisualizacionTiempos();
});

/* ------------------------------------------------------------
   Grupos de botones de opción (dificultad, modo, postura)
   Un click activa el botón pulsado y desactiva los demás
   del mismo grupo
------------------------------------------------------------ */
document.querySelectorAll('.btn-opcion').forEach(btn => {
  btn.addEventListener('click', () => {
    const grupo = btn.dataset.grupo;
    const valor = btn.dataset.valor;

    /* Desactivar todos los botones del mismo grupo */
    document.querySelectorAll(`.btn-opcion[data-grupo="${grupo}"]`)
      .forEach(b => b.classList.remove('active'));

    /* Activar el pulsado */
    btn.classList.add('active');

    /* Guardar en el estado */
    if (grupo === 'dificultad') estadoDebate.dificultad = valor;
    if (grupo === 'modo')       estadoDebate.modo       = valor;
    if (grupo === 'postura')    estadoDebate.postura     = valor;
  });
});

/* ------------------------------------------------------------
   Navegación entre secciones del sidebar
   Al hacer click en un ítem del sidebar se muestra la
   sección correspondiente y se marca como activa
------------------------------------------------------------ */
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', () => {
    const seccion = item.dataset.seccion;

    /* Actualizar botones del sidebar */
    document.querySelectorAll('.sidebar-item')
      .forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    /* Mostrar la sección correspondiente */
    document.querySelectorAll('.seccion')
      .forEach(s => s.classList.remove('active'));
    const secEl = document.getElementById(`sec-${seccion}`);
    if (secEl) secEl.classList.add('active');
  });
});

/* ------------------------------------------------------------
   Botón "Siguiente": avanza a la siguiente sección del sidebar
------------------------------------------------------------ */
document.getElementById('btnSiguiente')?.addEventListener('click', () => {
  const items   = Array.from(document.querySelectorAll('.sidebar-item'));
  const activo  = items.findIndex(i => i.classList.contains('active'));
  const siguiente = items[activo + 1];

  if (siguiente) siguiente.click();
});

/* ------------------------------------------------------------
   Inicialización: mostrar valores correctos al cargar
------------------------------------------------------------ */
actualizarVisualizacionTiempos();


/* ============================================================
   SECCIÓN TEMA
============================================================ */

/* ------------------------------------------------------------
   Banco de temas hardcodeado
   Cuando se conecte al backend, este array vendrá de la API
------------------------------------------------------------ */
const TEMAS = [
  {
    id       : 1,
    pregunta : '¿Debe aumentarse el presupuesto en educación superior pública?',
    categoria: 'Educación',
  },
  {
    id       : 2,
    pregunta : '¿La inteligencia artificial beneficiará más de lo que perjudicará a la sociedad?',
    categoria: 'Tecnología',
  },
  {
    id       : 3,
    pregunta : '¿Es ético el uso de animales en investigación científica?',
    categoria: 'Ética',
  },
  {
    id       : 4,
    pregunta : '¿Debe legalizarse la eutanasia?',
    categoria: 'Sociedad',
  },
  {
    id       : 5,
    pregunta : '¿Debería reducirse la jornada laboral a 4 días semanales?',
    categoria: 'Economía',
  },
  {
    id       : 6,
    pregunta : '¿Es la energía nuclear una solución viable para el cambio climático?',
    categoria: 'Medioambiente',
  },
];

/* Tema seleccionado actualmente */
let temaSeleccionado = null;

/* ------------------------------------------------------------
   renderizarTemas(lista)
   Pinta los temas en el DOM a partir de un array filtrado
------------------------------------------------------------ */
function renderizarTemas(lista) {
  const contenedor = document.getElementById('temasLista');
  if (!contenedor) return;

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="temas-vacio">No se encontraron temas.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(tema => `
    <div class="tema-item ${temaSeleccionado?.id === tema.id ? 'selected' : ''}"
         data-id="${tema.id}">
      <div class="tema-punto"></div>
      <div class="tema-contenido">
        <p class="tema-pregunta">${tema.pregunta}</p>
        <span class="tema-categoria">${tema.categoria}</span>
      </div>
    </div>
  `).join('');

  /* Asignar eventos de click a cada ítem */
  contenedor.querySelectorAll('.tema-item').forEach(item => {
    item.addEventListener('click', () => {
      const id   = parseInt(item.dataset.id);
      temaSeleccionado = TEMAS.find(t => t.id === id) || null;

      /* Guardar en el estado global del debate */
      estadoDebate.tema = temaSeleccionado;

      /* Refrescar lista para actualizar el seleccionado */
      const busqueda = document.getElementById('inputBuscar')?.value || '';
      renderizarTemas(filtrarTemas(busqueda));

      /* Activar botón continuar */
      actualizarBtnContinuarTema();
    });
  });
}

/* ------------------------------------------------------------
   filtrarTemas(texto)
   Devuelve los temas cuya pregunta o categoría contienen
   el texto buscado (insensible a mayúsculas)
------------------------------------------------------------ */
function filtrarTemas(texto) {
  const q = texto.toLowerCase().trim();
  if (!q) return TEMAS;
  return TEMAS.filter(t =>
    t.pregunta.toLowerCase().includes(q) ||
    t.categoria.toLowerCase().includes(q)
  );
}

/* ------------------------------------------------------------
   actualizarBtnContinuarTema()
   Activa o desactiva el botón CONTINUAR según si hay tema
------------------------------------------------------------ */
function actualizarBtnContinuarTema() {
  const btn = document.getElementById('btnContinuarTema');
  if (btn) btn.disabled = !temaSeleccionado;
}

/* ------------------------------------------------------------
   Buscador en tiempo real
------------------------------------------------------------ */
document.getElementById('inputBuscar')?.addEventListener('input', e => {
  renderizarTemas(filtrarTemas(e.target.value));
});

/* ------------------------------------------------------------
   Botón TEMA ALEATORIO
   Selecciona un tema al azar del banco completo
------------------------------------------------------------ */
document.getElementById('btnTemaAleatorio')?.addEventListener('click', () => {
  const indice     = Math.floor(Math.random() * TEMAS.length);
  temaSeleccionado = TEMAS[indice];
  estadoDebate.tema = temaSeleccionado;

  const busqueda = document.getElementById('inputBuscar')?.value || '';
  renderizarTemas(filtrarTemas(busqueda));
  actualizarBtnContinuarTema();
});

/* ------------------------------------------------------------
   Botón CONTINUAR (banco de temas)
   Avanza a la siguiente sección del sidebar
------------------------------------------------------------ */
document.getElementById('btnContinuarTema')?.addEventListener('click', () => {
  document.querySelector('.sidebar-item[data-seccion="fiera"]')?.click();
});

/* ------------------------------------------------------------
   Pestaña INGRESAR MANUALMENTE
   Activa CONTINUAR solo cuando ambos campos tienen texto
------------------------------------------------------------ */
const temaManual    = document.getElementById('temaManual');
const preguntaManual = document.getElementById('preguntaManual');
const btnContManual  = document.getElementById('btnContinuarManual');

function actualizarBtnManual() {
  if (!btnContManual) return;
  const ok = temaManual?.value.trim() && preguntaManual?.value.trim();
  btnContManual.disabled = !ok;
}

temaManual?.addEventListener('input', () => {
  estadoDebate.tema = {
    pregunta : preguntaManual?.value.trim(),
    categoria: temaManual?.value.trim(),
    manual   : true,
  };
  actualizarBtnManual();
});

preguntaManual?.addEventListener('input', () => {
  estadoDebate.tema = {
    pregunta : preguntaManual?.value.trim(),
    categoria: temaManual?.value.trim(),
    manual   : true,
  };
  actualizarBtnManual();
});

btnContManual?.addEventListener('click', () => {
  document.querySelector('.sidebar-item[data-seccion="fiera"]')?.click();
});

/* ------------------------------------------------------------
   Cambio entre pestañas (Banco / Manual)
------------------------------------------------------------ */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const destino = tab.dataset.tab;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`tab-${destino}`)?.classList.add('active');
  });
});

/* ------------------------------------------------------------
   Inicialización de la sección Tema
------------------------------------------------------------ */
renderizarTemas(TEMAS);
actualizarBtnContinuarTema();
actualizarBtnManual();


/* ============================================================
   SECCIÓN FIERA — Selección de personalidad
============================================================ */

/* ------------------------------------------------------------
   Lógica de selección de tarjetas de personalidad
   Al hacer click se marca como selected y se guarda en
   estadoDebate.personalidad
------------------------------------------------------------ */
document.querySelectorAll('.personalidad-card').forEach(card => {
  card.addEventListener('click', () => {
    /* Quitar selección anterior */
    document.querySelectorAll('.personalidad-card')
      .forEach(c => c.classList.remove('selected'));

    /* Seleccionar la pulsada */
    card.classList.add('selected');

    /* Guardar en estado global */
    estadoDebate.personalidad = card.dataset.valor;

    /* Activar botón continuar */
    const btnContinuar = document.getElementById('btnContinuarFiera');
    if (btnContinuar) btnContinuar.disabled = false;
  });
});

/* ------------------------------------------------------------
   Botón CONTINUAR de FIERA
   Avanza a la sección Turnos
------------------------------------------------------------ */
document.getElementById('btnContinuarFiera')?.addEventListener('click', () => {
  document.querySelector('.sidebar-item[data-seccion="turnos"]')?.click();
});


/* ============================================================
   SECCIÓN TURNOS
============================================================ */

/* Estado inicial: todos los turnos asignados a "equipo" */
estadoDebate.turnos = {
  intro     : 'equipo',
  ref1      : 'equipo',
  ref2      : 'equipo',
  conclusion: 'equipo',
};

/* ------------------------------------------------------------
   Toggle exclusivo: al hacer click en un btn-turno
   se activa ese y se desactiva el otro del mismo turno
------------------------------------------------------------ */
document.querySelectorAll('.btn-turno').forEach(btn => {
  btn.addEventListener('click', () => {
    const turno = btn.dataset.turno;
    const valor = btn.dataset.valor;

    /* Desactivar ambos botones del mismo turno */
    document.querySelectorAll(`.btn-turno[data-turno="${turno}"]`)
      .forEach(b => b.classList.remove('active'));

    /* Activar el pulsado */
    btn.classList.add('active');

    /* Guardar en estado global */
    estadoDebate.turnos[turno] = valor;
  });
});

/* ------------------------------------------------------------
   Botón CONTINUAR de Turnos → avanza a Resumen
------------------------------------------------------------ */
document.getElementById('btnContinuarTurnos')?.addEventListener('click', () => {
  document.querySelector('.sidebar-item[data-seccion="resumen"]')?.click();
});


/* ============================================================
   SECCIÓN RESUMEN
   Lee estadoDebate y rellena el HTML con los valores
   seleccionados en las secciones anteriores.
   Se actualiza cada vez que el usuario entra en Resumen.
============================================================ */

/* ------------------------------------------------------------
   Mapas de texto legible para cada valor interno
------------------------------------------------------------ */
const TEXTO_POSTURA      = { favor: 'A favor', contra: 'En contra', aleatoria: 'Aleatoria' };
const TEXTO_DIFICULTAD   = { basico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
const TEXTO_MODO         = { completo: 'Debate completo', express: 'Debate express' };
const TEXTO_PERSONALIDAD = { agresiva: 'Agresiva', elegante: 'Elegante', sarcastica: 'Sarcástica' };

/* ------------------------------------------------------------
   actualizarResumen()
   Rellena todos los campos del resumen con los datos actuales
   de estadoDebate. Se llama al entrar en la sección Resumen.
------------------------------------------------------------ */
function actualizarResumen() {

  /* Tema */
  const elTema = document.getElementById('res-tema');
  if (elTema) {
    if (estadoDebate.tema?.pregunta) {
      elTema.textContent = estadoDebate.tema.pregunta;
    } else {
      elTema.textContent = '—';
    }
  }

  /* Postura */
  const elPostura = document.getElementById('res-postura');
  if (elPostura) {
    elPostura.textContent = TEXTO_POSTURA[estadoDebate.postura] || '—';
  }

  /* Tiempos por turno */
  const campos = ['intro', 'ref1', 'ref2', 'conclusion'];
  campos.forEach(campo => {
    const el = document.getElementById(`res-t-${campo}`);
    if (el && estadoDebate.tiempos?.[campo] !== undefined) {
      el.textContent = `${formatearTiempo(estadoDebate.tiempos[campo])} min`;
    }
  });

  /* Nivel de dificultad */
  const elDif = document.getElementById('res-dificultad');
  if (elDif) {
    elDif.textContent = TEXTO_DIFICULTAD[estadoDebate.dificultad] || '—';
  }

  /* Personalidad de FIERA */
  const elPers = document.getElementById('res-personalidad');
  if (elPers) {
    elPers.textContent = TEXTO_PERSONALIDAD[estadoDebate.personalidad] || '—';
  }

  /* Modo */
  const elModo = document.getElementById('res-modo');
  if (elModo) {
    elModo.textContent = TEXTO_MODO[estadoDebate.modo] || '—';
  }
}

/* ------------------------------------------------------------
   Actualizar resumen cada vez que se entra en esa sección
   Se engancha al click del sidebar item de Resumen
------------------------------------------------------------ */
document.querySelector('.sidebar-item[data-seccion="resumen"]')
  ?.addEventListener('click', actualizarResumen);

/* ------------------------------------------------------------
   Botón VOLVER — retrocede a la sección Turnos
------------------------------------------------------------ */
document.getElementById('btnVolver')?.addEventListener('click', () => {
  document.querySelector('.sidebar-item[data-seccion="turnos"]')?.click();
});

/* ------------------------------------------------------------
   Botón INICIAR DEBATE
   Por ahora muestra un alert. Aquí se conectará el backend
   o se navegará a la pantalla del debate en vivo.
------------------------------------------------------------ */
document.getElementById('btnIniciarDebate')?.addEventListener('click', () => {
  console.log('Debate iniciado con config:', estadoDebate);
  /* TODO: navegar a la pantalla del debate en vivo */
  alert('¡Debate iniciado! Aquí arrancará la pantalla del debate.');
});