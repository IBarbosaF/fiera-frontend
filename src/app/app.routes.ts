import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';

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
  {
    path        : 'debate',
    loadComponent: () =>
      import('./pages/debate/debate').then(m => m.Debate)
  },

  /* ── Módulo clubs (sin MainLayout) ── */
  {
    path        : 'clubs',
    loadComponent: () =>
      import('./pages/clubs/clubs-hub/clubs-hub').then(m => m.ClubsHub)
  },
  {
    path        : 'clubs/explorar',
    loadComponent: () =>
      import('./pages/clubs/explorar-clubs/explorar-clubs').then(m => m.ExplorarClubs)
  },
  {
    path        : 'clubs/crear',
    loadComponent: () =>
      import('./pages/clubs/crear-club/crear-club').then(m => m.CrearClub)
  },
  {
    path        : 'clubs/:id',
    loadComponent: () =>
      import('./pages/clubs/club-detalle/club-detalle').then(m => m.ClubDetalle)
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
        path        : 'resultados',
        loadComponent: () =>
          import('./pages/resultados/resultados').then(m => m.Resultados)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
