import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Particles } from '../../shared/components/particles/particles';
import { Header } from '../../shared/components/header/header';

/* ============================================================
   MainLayout — Layout para páginas con sesión activa

   Usado en: ConfigDebate, Debate, Resultados
   Contiene: header + partículas + contenido de la página
   El header muestra nav completo y opción de cerrar sesión
============================================================ */

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Particles, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout {}
