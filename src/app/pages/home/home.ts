import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/* ============================================================
   HomeComponent — Página principal

   Dos estados según AuthService.estaLogueado():
   - Sin sesión : logo + título + botones login/registro + leona
   - Con sesión : título + botón COMENZAR DEBATE + leona

   Los modales de login y registro se gestionan aquí mismo
   ya que solo se usan en esta página.
============================================================ */

@Component({
  selector    : 'app-home',
  standalone  : true,
  imports     : [RouterLink],
  templateUrl : './home.html',
  styleUrl    : './home.css'
})
export class Home {

  /* Inyección del servicio de autenticación */
  auth = inject(AuthService);

  /* ── Estado de los modales ── */
  modalLoginAbierto    = signal(false);
  modalRegistroAbierto = signal(false);

  /* ── Errores de formulario ── */
  errorLogin    = signal('');
  errorRegistro = signal('');

  /* ── Campos del formulario de login ── */
  loginEmail    = signal('');
  loginPassword = signal('');

  /* ── Campos del formulario de registro ── */
  regNombre    = signal('');
  regApellidos = signal('');
  regEmail     = signal('');
  regPassword  = signal('');

  /* ----------------------------------------------------------
     Apertura y cierre de modales
  ---------------------------------------------------------- */
  abrirLogin(): void {
    this.errorLogin.set('');
    this.modalLoginAbierto.set(true);
  }

  cerrarLogin(): void {
    this.modalLoginAbierto.set(false);
    this.errorLogin.set('');
    this.loginEmail.set('');
    this.loginPassword.set('');
  }

  abrirRegistro(): void {
    this.errorRegistro.set('');
    this.modalRegistroAbierto.set(true);
  }

  cerrarRegistro(): void {
    this.modalRegistroAbierto.set(false);
    this.errorRegistro.set('');
    this.limpiarFormRegistro();
  }

  /* Navegar entre modales */
  irARegistro(): void {
    this.cerrarLogin();
    this.abrirRegistro();
  }

  irALogin(): void {
    this.cerrarRegistro();
    this.abrirLogin();
  }

  /* ----------------------------------------------------------
     login()
     Valida credenciales con AuthService
     TODO: conectar con backend cuando esté disponible
  ---------------------------------------------------------- */
  login(): void {
    this.errorLogin.set('');
    const resultado = this.auth.login(
      this.loginEmail(),
      this.loginPassword()
    );

    if (!resultado.ok) {
      this.errorLogin.set(resultado.error || '');
      return;
    }

    this.cerrarLogin();
  }

  /* ----------------------------------------------------------
     registrar()
     Registra nuevo usuario con AuthService
     TODO: conectar con backend cuando esté disponible
  ---------------------------------------------------------- */
  registrar(): void {
    this.errorRegistro.set('');
    const resultado = this.auth.registrar({
      nombre   : this.regNombre(),
      apellidos: this.regApellidos(),
      email    : this.regEmail(),
      password : this.regPassword()
    });

    if (!resultado.ok) {
      this.errorRegistro.set(resultado.error || '');
      return;
    }

    this.cerrarRegistro();
  }

  /* ----------------------------------------------------------
     cerrarAlClickarFuera()
     Cierra el modal al hacer click en el overlay
  ---------------------------------------------------------- */
  cerrarAlClickarFuera(event: MouseEvent, modal: 'login' | 'registro'): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      modal === 'login' ? this.cerrarLogin() : this.cerrarRegistro();
    }
  }

  /* ----------------------------------------------------------
     Helpers privados
  ---------------------------------------------------------- */
  private limpiarFormRegistro(): void {
    this.regNombre.set('');
    this.regApellidos.set('');
    this.regEmail.set('');
    this.regPassword.set('');
  }
}
