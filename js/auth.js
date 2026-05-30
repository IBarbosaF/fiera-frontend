/* ============================================================
   auth.js — Gestión de autenticación simulada
   
   Usa localStorage para simular sesiones sin backend.
   Los datos de usuarios se guardan en localStorage['fiera_users'].
   La sesión activa se guarda en localStorage['fiera_sesion'].
   
   Exporta funciones globales usadas por main.js
============================================================ */

/* ------------------------------------------------------------
   Clave de almacenamiento en localStorage
------------------------------------------------------------ */
const STORAGE_USUARIOS = 'fiera_users';
const STORAGE_SESION   = 'fiera_sesion';

/* ------------------------------------------------------------
   obtenerUsuarios()
   Devuelve el array de usuarios registrados del localStorage
------------------------------------------------------------ */
function obtenerUsuarios() {
  const datos = localStorage.getItem(STORAGE_USUARIOS);
  return datos ? JSON.parse(datos) : [];
}

/* ------------------------------------------------------------
   guardarUsuarios(usuarios)
   Persiste el array de usuarios en localStorage
------------------------------------------------------------ */
function guardarUsuarios(usuarios) {
  localStorage.setItem(STORAGE_USUARIOS, JSON.stringify(usuarios));
}

/* ------------------------------------------------------------
   obtenerSesion()
   Devuelve el objeto del usuario con sesión activa, o null
------------------------------------------------------------ */
function obtenerSesion() {
  const datos = localStorage.getItem(STORAGE_SESION);
  return datos ? JSON.parse(datos) : null;
}

/* ------------------------------------------------------------
   iniciarSesionStorage(usuario)
   Guarda el usuario activo en localStorage
------------------------------------------------------------ */
function iniciarSesionStorage(usuario) {
  localStorage.setItem(STORAGE_SESION, JSON.stringify(usuario));
}

/* ------------------------------------------------------------
   cerrarSesionStorage()
   Elimina la sesión activa del localStorage
------------------------------------------------------------ */
function cerrarSesionStorage() {
  localStorage.removeItem(STORAGE_SESION);
}

/* ------------------------------------------------------------
   registrarUsuario(datos)
   Registra un nuevo usuario si el email no existe ya.
   Devuelve { ok: true } o { ok: false, error: 'mensaje' }
------------------------------------------------------------ */
function registrarUsuario({ nombre, apellidos, email, password }) {
  if (!nombre || !apellidos || !email || !password) {
    return { ok: false, error: 'Rellena todos los campos.' };
  }

  if (password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const usuarios = obtenerUsuarios();
  const existe   = usuarios.find(u => u.email === email.toLowerCase());

  if (existe) {
    return { ok: false, error: 'Este email ya está registrado.' };
  }

  /* Guardar nuevo usuario (sin encriptar: es simulación) */
  const nuevoUsuario = {
    nombre,
    apellidos,
    email   : email.toLowerCase(),
    password,
  };

  usuarios.push(nuevoUsuario);
  guardarUsuarios(usuarios);
  iniciarSesionStorage(nuevoUsuario);

  return { ok: true, usuario: nuevoUsuario };
}

/* ------------------------------------------------------------
   loginUsuario(email, password)
   Comprueba credenciales y activa la sesión si son correctas.
   Devuelve { ok: true } o { ok: false, error: 'mensaje' }
------------------------------------------------------------ */
function loginUsuario(email, password) {
  if (!email || !password) {
    return { ok: false, error: 'Introduce email y contraseña.' };
  }

  const usuarios = obtenerUsuarios();
  const usuario  = usuarios.find(
    u => u.email === email.toLowerCase() && u.password === password
  );

  if (!usuario) {
    return { ok: false, error: 'Email o contraseña incorrectos.' };
  }

  iniciarSesionStorage(usuario);
  return { ok: true, usuario };
}