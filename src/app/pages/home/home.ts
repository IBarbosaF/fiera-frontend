import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
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

  /* Router para navegación */
  router = inject(Router);

  /* ── Estado de los modales ── */
  modalLoginAbierto    = signal(false);

  /* ── Errores de formulario ── */
  errorLogin    = signal('');

  /* ── Campos del formulario de login ── */
  loginEmail    = signal('');
  loginPassword = signal('');

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
    this.router.navigate(['/registro']);  // reemplaza el contenido anterior
  }

  /* Navegar entre modales */
  irARegistro(): void {
    this.cerrarLogin();
    this.router.navigate(['/registro']);  // reemplaza el contenido anterior
  }

  irALogin(): void {
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
     cerrarAlClickarFuera()
     Cierra el modal al hacer click en el overlay
  ---------------------------------------------------------- */
  cerrarAlClickarFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarLogin();
    }
  }

}
