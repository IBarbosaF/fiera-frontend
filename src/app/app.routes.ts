import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';

/* ============================================================
   Rutas de la aplicación

   FUERA del MainLayout — páginas con layout propio:
   · /registro         → Registro (wizard multi-paso)
   · /configurar       → ConfigDebate (config de partida)
   · /partida          → PartidaDebate (debate en vivo)
   · /clubs            → ClubsHub
   · /clubs/explorar   → ExplorarClubs
   · /clubs/crear      → CrearClub
   · /clubs/:id        → ClubDetalle

   DENTRO del MainLayout — páginas con sidebar global:
   · /                 → Home (dashboard)
   · /debate           → DebateHub (3 opciones)
   · /debate/rapido    → DebateRapido
   · /debate/unirse    → UnirseDebate
   · /resultados       → Resultados

   NOTA: /configurar y /partida viven fuera del MainLayout
   para evitar conflicto con las rutas hijas de /debate.
   El DebateHub enlaza a /configurar y /partida directamente.
============================================================ */

export const routes: Routes = [

  /* ── Rutas sin MainLayout — layout propio ─────────────── */

  {
    path        : 'registro',
    loadComponent: () =>
      import('./pages/registro/registro').then(m => m.Registro)
  },
  {
    path        : 'debate-configurar',
    loadComponent: () =>
      import('./pages/debate/config-debate/config-debate').then(m => m.ConfigDebate)
  },
  {
    path        : 'debate-partida',
    loadComponent: () =>
      import('./pages/debate/partida-debate/partida-debate').then(m => m.PartidaDebate)
  },

  /* ── Módulo clubs — sin MainLayout ────────────────────── */
  /* IMPORTANTE: rutas específicas antes del wildcard :id   */
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
      {
        path        : 'debate',
        loadComponent: () =>
          import('./pages/debate/debate-hub/debate-hub').then(m => m.DebateHub)
      },
      {
        path        : 'debate/rapido',
        loadComponent: () =>
          import('./pages/debate/debate-rapido/debate-rapido').then(m => m.DebateRapido)
      },
      {
        path        : 'debate/unirse',
        loadComponent: () =>
          import('./pages/debate/unirse-debate/unirse-debate').then(m => m.UnirseDebate)
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
