import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';

export const routes: Routes = [

  /* ── Rutas sin MainLayout — layout propio ─────────────── */
  {
    path        : 'registro',
    loadComponent: () =>
      import('./pages/registro/registro').then(m => m.Registro)
  },
  {
    path        : 'crear-debate',
    loadComponent: () =>
      import('./pages/debate/crear-debate/crear-debate').then(m => m.CrearDebate)
  },
  {
    path        : 'debate-partida',
    loadComponent: () =>
      import('./pages/debate/partida-debate/partida-debate').then(m => m.PartidaDebate)
  },
  {
    path        : 'crear-liga',
    loadComponent: () =>
      import('./pages/ligas/crear-liga/crear-liga').then(m => m.CrearLiga)
  },

  /* ── Módulo clubs sin MainLayout ──────────────────────── */
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

  /* ── Rutas con MainLayout — sidebar global ─────────────── */
  {
    path     : '',
    component: MainLayout,
    children : [

      {
        path        : '',
        loadComponent: () =>
          import('./pages/home/home').then(m => m.Home)
      },

      /* Comunidad */
      {
        path        : 'comunidad',
        loadComponent: () =>
          import('./pages/comunidad/comunidad-hub/comunidad-hub').then(m => m.ComunidadHub)
      },

      /* Ligas */
      {
        path        : 'ligas',
        loadComponent: () =>
          import('./pages/ligas/liga-hub/liga-hub').then(m => m.LigaHub)
      },
      {
        path        : 'ligas/unirse',
        loadComponent: () =>
          import('./pages/ligas/unirse-liga/unirse-liga').then(m => m.UnirseLiga)
      },

      /* Ranking */
      {
        path        : 'ranking',
        loadComponent: () =>
          import('./pages/ranking/ranking').then(m => m.Ranking)
      },

      /* Clubs */
      {
        path        : 'clubs',
        loadComponent: () =>
          import('./pages/clubs/clubs-hub/clubs-hub').then(m => m.ClubsHub)
      },

      /* Academia */
      {
        path        : 'academia',
        loadComponent: () =>
          import('./pages/academia/academia-hub/academia-hub').then(m => m.AcademiaHub)
      },

      /* Perfil */
      {
        path        : 'perfil',
        loadComponent: () =>
          import('./pages/perfil/perfil').then(m => m.Perfil)
      },

      /* Logros */
      {
        path        : 'logros',
        loadComponent: () =>
          import('./pages/logros/logros').then(m => m.Logros)
      },

      /* Ajustes */
      {
        path        : 'ajustes',
        loadComponent: () =>
          import('./pages/ajustes/ajustes').then(m => m.Ajustes)
      },

      /* Resultados */
      {
        path        : 'resultados',
        loadComponent: () =>
          import('./pages/resultados/resultados').then(m => m.Resultados)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
