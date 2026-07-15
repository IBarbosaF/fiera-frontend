import { Injectable } from '@angular/core';

/* ============================================================
   RetosService — Infraestructura compartida por los retos diarios
   (Careo, Clash, Preguntón)

   Solo contiene lo que es genuinamente común: el hash determinista
   de fecha para que todos los usuarios vean el mismo reto el mismo
   día, y un helper genérico para elegir 1 elemento de una lista
   según ese hash. La lógica propia de cada reto vive en su propio
   servicio (DebateService para Careo, PreguntonService, etc.).
============================================================ */

@Injectable({ providedIn: 'root' })
export class RetosService {

  fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  /** Hash simple y determinista a partir de una fecha (YYYY-MM-DD) */
  seedDelDia(fecha: string = this.fechaHoy()): number {
    let hash = 0;
    for (let i = 0; i < fecha.length; i++) {
      hash = (hash << 5) - hash + fecha.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /** Elige 1 elemento de una lista de forma determinista según el día */
  elegirDelDia<T>(lista: T[]): T | null {
    if (!lista.length) return null;
    return lista[this.seedDelDia() % lista.length];
  }
}
