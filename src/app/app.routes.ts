import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';

/* ============================================================
   Rutas de la aplicación

   MainLayout: rutas que usan el header global (home, debate, resultados)
   Standalone: rutas con layout propio (registro, configurar)
============================================================ */

export const routes: Routes = [

  /* ── Rutas con layout propio (sin MainLayout) ── */
  {
    path        : 'registro',
    loadComponent: () =>
      import('./pages/registro/registro').then(m => m.Registro)
  },
  {
    path        : 'configurar',
    loadComponent: () =>
      import('./pages/config-debate/config-debate').then(m => m.ConfigDebate)
  },

  /* ── Rutas con header global ── */
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
