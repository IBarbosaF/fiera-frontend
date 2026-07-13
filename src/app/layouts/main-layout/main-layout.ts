import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Particles } from '../../shared/components/particles/particles';
import { Header } from '../../shared/components/header/header';
import { AuthService } from '../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

@Component({
  selector    : 'app-main-layout',
  standalone  : true,
  imports     : [RouterOutlet, Particles, Header],
  templateUrl : './main-layout.html',
  styleUrl    : './main-layout.css'
})
export class MainLayout {
  auth   = inject(AuthService);
  router = inject(Router);

    urlActual = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /**
   * mostrarLeona — true en cualquier ruta excepto las indicadas.
   */
  mostrarLeona = computed(() => {
    const url = this.urlActual();
    // Rutas donde NO se muestra la leona (contenido llena la pantalla)
    const rutasSinLeona = ['/', '/perfil'];
    return !rutasSinLeona.includes(url);
  });
}
