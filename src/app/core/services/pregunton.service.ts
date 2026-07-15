import { Injectable, inject } from '@angular/core';
import { TemaApi } from './debate.service';
import { RetosService } from './retos.service';

/* ============================================================
   PreguntonService — Reglas propias del reto Preguntón

   TODO: confirmar con backend los valores reales de `status` y
   `origen` (asumo 'APROBADO' y 'USUARIO' en mayúsculas, mismo
   patrón que otros enums del proyecto)
============================================================ */

@Injectable({ providedIn: 'root' })
export class PreguntonService {

  private retos = inject(RetosService);

  private esValida(tema: TemaApi): boolean {
    return tema.origen === 'USUARIO' && tema.status === 'APROBADO';
  }

  /** Pregunta del día — mismo criterio de fecha que el resto de retos,
      filtrado solo a preguntas de usuario ya validadas por el superadmin */
  getPreguntaDelDia(temas: TemaApi[]): TemaApi | null {
    return this.retos.elegirDelDia(temas.filter(t => this.esValida(t)));
  }

  /** Ranking completo, ordenado por likes descendente */
  getRanking(temas: TemaApi[]): TemaApi[] {
    return temas
      .filter(t => this.esValida(t))
      .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  }

  /** Traduce likes a una escala visual de 0-3 corazones para el ranking.
      TODO: ajustar umbrales cuando sepamos el rango real de `likes`
      en producción — de momento son una aproximación. */
  corazonesVisual(likes: number): boolean[] {
    const nivel = likes >= 100 ? 3 : likes >= 40 ? 2 : likes >= 10 ? 1 : 0;
    return [0, 1, 2].map(i => i < nivel);
  }

  // TODO: votar() real cuando exista el endpoint de actualizar likes
  // (PUT /api/app/temas/{id} o equivalente)
}
