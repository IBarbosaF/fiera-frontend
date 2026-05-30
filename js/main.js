/* ============================================================
   main.js — Lógica principal compartida en TODAS las páginas

   Gestiona:
   - Estado visual según sesión (con/sin sesión)
   - Apertura y cierre de modales (login y registro)
   - Formularios de login y registro
   - Menú hamburger en móvil (todas las páginas)
   - Navegación activa en bottom nav
============================================================ */

/* ------------------------------------------------------------
   Referencias a elementos del DOM
   Algunos solo existen en index.html, se comprueba antes
   de usarlos con el operador ?.
------------------------------------------------------------ */
const body            = document.body;
const hamburger       = document.getElementById('hamburger');
const mobileMenu      = document.getElementById('mobileMenu');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const btnCerrarMobile = document.getElementById('btnCerrarSesionMobile');

/* Solo en index.html */
const btnAbrirLogin    = document.getElementById('btnAbrirLogin');
const btnAbrirRegistro = document.getElementById('btnAbrirRegistro');
const modalLogin       = document.getElementById('modalLogin');
const modalRegistro    = document.getElementById('modalRegistro');
const cerrarLogin      = document.getElementById('cerrarLogin');
const cerrarRegistro   = document.getElementById('cerrarRegistro');
const irARegistro      = document.getElementById('irARegistro');
const irALogin         = document.getElementById('irALogin');
const loginEmail       = document.getElementById('loginEmail');
const loginPassword    = document.getElementById('loginPassword');
const loginError       = document.getElementById('loginError');
const btnLogin         = document.getElementById('btnLogin');
const regNombre        = document.getElementById('regNombre');
const regApellidos     = document.getElementById('regApellidos');
const regEmail         = document.getElementById('regEmail');
const regPassword      = document.getElementById('regPassword');
const registroError    = document.getElementById('registroError');
const btnRegistro      = document.getElementById('btnRegistro');

/* ============================================================
   ESTADO DE SESIÓN
============================================================ */

/* ------------------------------------------------------------
   aplicarEstadoSesion()
   - Si la página ya tiene .con-sesion en el HTML (páginas
     protegidas como debates.html), la respeta directamente.
   - Si no, comprueba localStorage y aplica la clase.
   En ambos casos el hamburger siempre queda operativo.
------------------------------------------------------------ */
function aplicarEstadoSesion() {
  const paginaProtegida = body.classList.contains('con-sesion');
  const sesion          = obtenerSesion();

  if (paginaProtegida || sesion) {
    body.classList.add('con-sesion');
  } else {
    body.classList.remove('con-sesion');
  }
}

/* ============================================================
   MENÚ HAMBURGER
   Global: funciona en todas las páginas que tengan
   #hamburger y #mobileMenu en el HTML.
============================================================ */
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  /* Cerrar al hacer click en cualquier enlace del menú */
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

/* ============================================================
   CERRAR SESIÓN
   Global: funciona en cualquier página que tenga el botón
============================================================ */
function manejarCierreSesion() {
  cerrarSesionStorage();
  /* Redirigir siempre al inicio al cerrar sesión */
  window.location.href = 'index.html';
}

if (btnCerrarSesion) btnCerrarSesion.addEventListener('click', manejarCierreSesion);
if (btnCerrarMobile) btnCerrarMobile.addEventListener('click', manejarCierreSesion);

/* ============================================================
   MODALES — solo en index.html
============================================================ */

/* ------------------------------------------------------------
   abrirModal / cerrarModal
------------------------------------------------------------ */
function abrirModal(modal) {
  if (!modal) return;
  modal.classList.add('activo');
  body.style.overflow = 'hidden';
}

function cerrarModal(modal) {
  if (!modal) return;
  modal.classList.remove('activo');
  body.style.overflow = '';
  limpiarErrores();
}

function limpiarErrores() {
  if (loginError)    loginError.textContent    = '';
  if (registroError) registroError.textContent = '';
}

/* Cerrar al hacer click fuera de la tarjeta */
modalLogin?.addEventListener('click',    e => { if (e.target === modalLogin)    cerrarModal(modalLogin); });
modalRegistro?.addEventListener('click', e => { if (e.target === modalRegistro) cerrarModal(modalRegistro); });

/* Cerrar con Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    cerrarModal(modalLogin);
    cerrarModal(modalRegistro);
  }
});

/* Abrir modales desde el hero */
btnAbrirLogin?.addEventListener('click', () => abrirModal(modalLogin));
btnAbrirRegistro?.addEventListener('click', e => {
  e.preventDefault();
  abrirModal(modalRegistro);
});

/* Botones X de cierre */
cerrarLogin?.addEventListener('click',    () => cerrarModal(modalLogin));
cerrarRegistro?.addEventListener('click', () => cerrarModal(modalRegistro));

/* Cambiar entre modales */
irARegistro?.addEventListener('click', e => {
  e.preventDefault();
  cerrarModal(modalLogin);
  abrirModal(modalRegistro);
});

irALogin?.addEventListener('click', e => {
  e.preventDefault();
  cerrarModal(modalRegistro);
  abrirModal(modalLogin);
});

/* ============================================================
   FORMULARIO LOGIN
============================================================ */
btnLogin?.addEventListener('click', () => {
  limpiarErrores();
  const resultado = loginUsuario(loginEmail.value.trim(), loginPassword.value);

  if (!resultado.ok) {
    loginError.textContent = resultado.error;
    return;
  }

  cerrarModal(modalLogin);
  aplicarEstadoSesion();
  loginEmail.value    = '';
  loginPassword.value = '';
});

/* ============================================================
   FORMULARIO REGISTRO
============================================================ */
btnRegistro?.addEventListener('click', () => {
  limpiarErrores();
  const resultado = registrarUsuario({
    nombre   : regNombre.value.trim(),
    apellidos: regApellidos.value.trim(),
    email    : regEmail.value.trim(),
    password : regPassword.value,
  });

  if (!resultado.ok) {
    registroError.textContent = resultado.error;
    return;
  }

  cerrarModal(modalRegistro);
  aplicarEstadoSesion();
  regNombre.value    = '';
  regApellidos.value = '';
  regEmail.value     = '';
  regPassword.value  = '';
});

/* ============================================================
   INICIALIZACIÓN — se ejecuta al cargar cualquier página
============================================================ */
aplicarEstadoSesion();