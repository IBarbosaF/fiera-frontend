import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector        : 'app-home',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './home.html',
  styleUrl        : './home.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Home {

  auth   = inject(AuthService);
  router = inject(Router);

  /* ── Modales ── */
  modalLoginAbierto = signal(false);

  /* ── Errores ── */
  errorLogin = signal('');

  /* ── Ojo contraseña ── */
  verPassword   = false;
  emailValue    = '';
  passwordValue = '';

  /* ----------------------------------------------------------
     Modales
  ---------------------------------------------------------- */
  abrirLogin(): void {
    this.errorLogin.set('');
    this.modalLoginAbierto.set(true);
  }

  cerrarLogin(): void {
    this.modalLoginAbierto.set(false);
    this.errorLogin.set('');
    this.emailValue    = '';
    this.passwordValue = '';
    this.verPassword   = false;
  }

  abrirRegistro(): void {
    this.router.navigate(['/registro']);
  }

  irARegistro(): void {
    this.cerrarLogin();
    this.router.navigate(['/registro']);
  }

  toggleVerPassword(): void {
    this.verPassword = !this.verPassword;
  }

  /* ----------------------------------------------------------
     login()
     TODO: conectar con backend cuando esté disponible
  ---------------------------------------------------------- */
  login(email: string, password: string): void {
    this.errorLogin.set('');
    const resultado = this.auth.login(email, password);

    if (!resultado.ok) {
      this.errorLogin.set(resultado.error || '');
      return;
    }

    this.cerrarLogin();
  }

  /* ----------------------------------------------------------
     cerrarAlClickarFuera()
  ---------------------------------------------------------- */
  cerrarAlClickarFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarLogin();
    }
  }
}
