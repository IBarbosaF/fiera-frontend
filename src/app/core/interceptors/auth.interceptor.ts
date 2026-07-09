import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/* ============================================================
   authInterceptor — Interceptor funcional (Angular 21)

   1. Añade 'Authorization: Bearer {token}' a cada petición
      dirigida al backend de FIERA.
   2. Si el backend responde 401 (token caducado), intenta
      refrescar el token una única vez y reintenta la petición
      original. Si el refresco falla, cierra sesión y redirige
      al login.

   Nota: 'refrescando' y 'refrescoCompletado$' viven a nivel de
   módulo (fuera de la función) para que TODAS las peticiones
   concurrentes que reciban un 401 al mismo tiempo compartan
   el mismo refresco en curso, en vez de disparar varios.
============================================================ */

const API_BASE = 'https://fiera.retorika.es';

const RUTAS_PUBLICAS = [
  `${API_BASE}/api/auth/login`,
  `${API_BASE}/api/auth/register`,
  `${API_BASE}/api/auth/refresh`,
];

let refrescando = false;
const refrescoCompletado$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router       = inject(Router);

  const esNuestroBackend = req.url.startsWith(API_BASE);
  const esRutaPublica     = RUTAS_PUBLICAS.some(ruta => req.url.startsWith(ruta));

  /* Peticiones a otros dominios o rutas públicas → sin tocar */
  if (!esNuestroBackend || esRutaPublica) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const reqConToken = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqConToken).pipe(
    catchError((error: HttpErrorResponse) => {
      /* Solo actuamos ante un 401. Cualquier otro error sigue su curso. */
      if (error.status !== 401) {
        return throwError(() => error);
      }

      /* Ya hay un refresh en marcha → esperamos su resultado
         y reintentamos esta petición con el token nuevo */
      if (refrescando) {
        return refrescoCompletado$.pipe(
          filter(tokenNuevo => tokenNuevo !== null),
          take(1),
          switchMap(tokenNuevo => {
            const reintento = req.clone({ setHeaders: { Authorization: `Bearer ${tokenNuevo}` } });
            return next(reintento);
          })
        );
      }

      /* Primer 401 → disparamos el refresh */
      refrescando = true;
      refrescoCompletado$.next(null);

      return authService.refrescarToken().pipe(
        switchMap(exito => {
          refrescando = false;

          if (!exito) {
            router.navigate(['/']);
            return throwError(() => error);
          }

          const tokenNuevo = authService.getAccessToken();
          refrescoCompletado$.next(tokenNuevo);

          const reintento = req.clone({ setHeaders: { Authorization: `Bearer ${tokenNuevo}` } });
          return next(reintento);
        })
      );
    })
  );
};
