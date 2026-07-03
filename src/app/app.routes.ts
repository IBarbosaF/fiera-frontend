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
    path        : 'partida-debate',
    loadComponent: () =>
      import('./pages/debate/partida-debate/partida-debate').then(m => m.PartidaDebate)
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

      /* Retos */
      {
        path        : 'retos',
        loadComponent: () =>
          import('./pages/retos/retos-hub/retos-hub').then(m => m.RetosHub)
      },
      {
        path        : 'careo-diario',
        loadComponent: () =>
          import('./pages/retos/retos-careo/careo-diario/careo-diario').then(m => m.CareoDiario)
      },
      {
        path        : 'clash-diario',
        loadComponent: () =>
          import('./pages/retos/retos-clash/clash-diario/clash-diario').then(m => m.ClashDiario)
      },
      {
        path        : 'pregunton-diario',
        loadComponent: () =>
          import('./pages/retos/retos-pregunton/pregunton-diario/pregunton-diario').then(m => m.PreguntonDiario)
      },

      /* Ligas */
      {
        path        : 'ligas',
        loadComponent: () =>
          import('./pages/ligas/liga-hub/liga-hub').then(m => m.LigaHub)
      },
      {
        path        : 'crear-liga',
        loadComponent: () =>
          import('./pages/ligas/crear-liga/crear-liga').then(m => m.CrearLiga)
      },
      {
        path        : 'ligas/unirse',
        loadComponent: () =>
          import('./pages/ligas/unirse-liga/unirse-liga').then(m => m.UnirseLiga)
      },
      /* Crear Debate */
      {
        path        : 'crear-debate',
        loadComponent: () =>
          import('./pages/debate/crear-debate/crear-debate').then(m => m.CrearDebate)
      },
      {
        path        : 'unirse-debate',
        loadComponent: () =>
          import('./pages/debate/unirse-debate/unirse-debate').then(m => m.UnirseDebate)
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
          import('./pages/clubs/club-publico/club-publico').then(m => m.ClubPublico)
      },
      {
        path        : 'clubs/:id',
        loadComponent: () =>
          import('./pages/clubs/club-detalle/club-detalle').then(m => m.ClubDetalle)
      },

      /* Recursos */
      {
        path        : 'recursos',
        loadComponent: () =>
          import('./pages/recursos/recursos-hub/recursos-hub').then(m => m.RecursosHub)
      },
      {
        path        : 'recursos/torneos',
        loadComponent: () =>
          import('./pages/recursos/calendario-torneo/calendario-torneo').then(m => m.CalendarioTorneo)
      },
      {
        path        : 'recursos/formaciones-youtube',
        loadComponent: () =>
          import('./pages/recursos/formaciones-youtube/formaciones-youtube')
            .then(m => m.FormacionesYoutube)
      },
      {
        path        : 'recursos/preguntas',
        loadComponent: () =>
          import('./pages/recursos/banco-preguntas/banco-preguntas').then(m => m.BancoPreguntas)
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
          import('./pages/debate/resultados/resultados').then(m => m.Resultados)
      },
      /* Careo */
      {
        path: 'careo-diario',
        loadComponent: () => import('./pages/retos/retos-careo/careo-diario/careo-diario').then(m => m.CareoDiario)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
