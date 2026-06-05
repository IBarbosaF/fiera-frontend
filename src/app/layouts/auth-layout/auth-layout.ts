import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Particles } from '../../shared/components/particles/particles';

/* ============================================================
   AuthLayout — Layout para páginas sin sesión

   Usado en: HomeComponent (cuando no hay sesión)
   Contiene: solo partículas de fondo + contenido de la página
   Sin header ni navegación
============================================================ */

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, Particles],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css'
})
export class AuthLayout {}
