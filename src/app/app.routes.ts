import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';

/* ============================================================
   Rutas de la aplicación

   Todas las páginas usan MainLayout.
   MainLayout muestra el header solo cuando hay sesión activa
   controlado por AuthService.estaLogueado()
============================================================ */

export const routes: Routes = [
  {
    path     : '',
    component: MainLayout,
    children : [
      {
        path        : '',
        loadComponent: () =>
          import('./pages/home/home').then(m => m.Home)
      },
      {
        path        : 'configurar',
        loadComponent: () =>
          import('./pages/config-debate/config-debate').then(m => m.ConfigDebate)
      },
      {
        path        : 'debate',
        loadComponent: () =>
          import('./pages/debate/debate').then(m => m.Debate)
      },
      {
        path        : 'resultados',
        loadComponent: () =>
          import('./pages/resultados/resultados').then(m => m.Resultados)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
