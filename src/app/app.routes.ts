import { Routes } from '@angular/router';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';

/* ============================================================
   Rutas de la aplicación

   AuthLayout  → páginas sin sesión (home)
   MainLayout  → páginas con sesión (config, debate, resultados)
============================================================ */

export const routes: Routes = [
  {
    path     : '',
    component: AuthLayout,
    children : [
      {
        path     : '',
        loadComponent: () =>
          import('./pages/home/home').then(m => m.Home)
      }
    ]
  },
  {
    path     : '',
    component: MainLayout,
    children : [
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
