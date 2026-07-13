import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import {
  LOGROS_DEFINICIONES,
  LogroConProgreso,
  NivelLogro,
  ProgresoLogro,
} from '../models/logro.model';

/* ============================================================
   LogroService — Cálculo y persistencia de progreso de logros

   Fuente de verdad por logro:
   · 'debates-jugados' → se calcula en vivo desde
     usuario().debatesParticipados (dato real del backend).
   · Resto de logros    → mock en localStorage, arrancan en 0
     y esperan a que el backend exponga los datos necesarios
     (fechas por debate, victoria/derrota, completitud de
     perfil, registro de creación de club/torneo).

   Puntos: el backend no tiene endpoint para sumar puntos por
   logro todavía, así que se acumulan en localStorage como
   bonus visual (fiera_logros_puntos) hasta que exista.
   TODO: sustituir por llamada real cuando María Rosa
   defina el endpoint de puntos por logro.
============================================================ */

const STORAGE_PROGRESO      = 'fiera_logros_progreso';
const STORAGE_PUNTOS_LOGROS = 'fiera_logros_puntos';
const STORAGE_NIVELES_COBRADOS = 'fiera_logros_cobrados';

@Injectable({ providedIn: 'root' })
export class LogroService {

  private auth = inject(AuthService);

  /* ── Progreso mock persistido (todos los logros salvo volumen) ── */
  private _progresoMock = signal<ProgresoLogro[]>(this.cargarProgresoMock());

  /* ── Puntos acumulados por logros (bonus local, ver TODO arriba) ── */
  private _puntosLogros = signal<number>(this.cargarPuntosLogros());
  puntosLogros = this._puntosLogros.asReadonly();

  /* ── Niveles ya "cobrados", para no duplicar puntos al recalcular ── */
  private nivelesCobrados = this.cargarNivelesCobrados();

  /* ----------------------------------------------------------
     progresoVolumenReal
     Único logro calculado en vivo — deriva del array real
     de debates del usuario logueado.
  ---------------------------------------------------------- */
  private progresoVolumenReal = computed<ProgresoLogro>(() => {
    const definicion = LOGROS_DEFINICIONES.find(l => l.id === 'debates-jugados')!;
    const total      = this.auth.usuario()?.debatesParticipados?.length ?? 0;
    const nivel      = this.calcularNivelAlcanzado(definicion.niveles, total);

    return {
      logroId          : 'debates-jugados',
      valorActual      : total,
      nivelDesbloqueado: nivel,
    };
  });

  /* ----------------------------------------------------------
     logros
     Combina cada definición del catálogo con su progreso
     (real o mock) y expone el estado listo para pintar.
  ---------------------------------------------------------- */
  logros = computed<LogroConProgreso[]>(() => {
    return LOGROS_DEFINICIONES.map(def => {
      const progreso = def.id === 'debates-jugados'
        ? this.progresoVolumenReal()
        : this._progresoMock().find(p => p.logroId === def.id) ?? this.progresoVacio(def.id);

      const completado     = progreso.nivelDesbloqueado === def.niveles.length;
      const siguienteNivel = completado ? null : def.niveles[progreso.nivelDesbloqueado] ?? null;

      return { ...def, progreso, completado, siguienteNivel };
    });
  });

  totalDesbloqueados = computed(() => this.logros().filter(l => l.completado).length);

  constructor() {
    /* Cada vez que cambia el progreso real de volumen,
       cobramos los puntos de los niveles recién alcanzados. */
    effect(() => {
      this.cobrarPuntosNuevos(this.progresoVolumenReal());
    });
  }

  /* ----------------------------------------------------------
     desbloquearMock()
     Punto de entrada genérico para activar manualmente un
     logro mock (perfil, racha, resultados, comunidad) desde
     donde corresponda una vez exista el dato real que lo
     dispare. De momento no se llama desde ningún sitio.
     TODO: conectar cuando el backend exponga el dato asociado.
  ---------------------------------------------------------- */
  desbloquearMock(logroId: string, nivel: number, valorActual: number): void {
    const definicion = LOGROS_DEFINICIONES.find(l => l.id === logroId);
    if (!definicion) return;

    const progreso: ProgresoLogro = {
      logroId,
      valorActual,
      nivelDesbloqueado: nivel,
      fechaUltimoNivel : new Date().toISOString(),
    };

    const lista = this._progresoMock().filter(p => p.logroId !== logroId);
    this.guardarProgresoMock([...lista, progreso]);
    this.cobrarPuntosNuevos(progreso, definicion.niveles);
  }

  /* ── Helpers privados ── */

  private calcularNivelAlcanzado(niveles: NivelLogro[], valor: number): number {
    let nivel = 0;
    for (const n of niveles) {
      if (valor >= n.objetivo) nivel = n.nivel;
    }
    return nivel;
  }

  private progresoVacio(logroId: string): ProgresoLogro {
    return { logroId, valorActual: 0, nivelDesbloqueado: 0 };
  }

  private cobrarPuntosNuevos(progreso: ProgresoLogro, nivelesOverride?: NivelLogro[]): void {
    const definicion = LOGROS_DEFINICIONES.find(l => l.id === progreso.logroId);
    if (!definicion) return;
    const niveles = nivelesOverride ?? definicion.niveles;

    let puntosNuevos = 0;
    for (const n of niveles) {
      const clave = `${progreso.logroId}-${n.nivel}`;
      const yaAlcanzado = progreso.nivelDesbloqueado >= n.nivel;
      if (yaAlcanzado && !this.nivelesCobrados.has(clave)) {
        this.nivelesCobrados.add(clave);
        puntosNuevos += n.puntos;
      }
    }

    if (puntosNuevos > 0) {
      this._puntosLogros.update(p => p + puntosNuevos);
      localStorage.setItem(STORAGE_PUNTOS_LOGROS, String(this._puntosLogros()));
      localStorage.setItem(STORAGE_NIVELES_COBRADOS, JSON.stringify([...this.nivelesCobrados]));
    }
  }

  private cargarProgresoMock(): ProgresoLogro[] {
    const datos = localStorage.getItem(STORAGE_PROGRESO);
    return datos ? JSON.parse(datos) : [];
  }

  private guardarProgresoMock(lista: ProgresoLogro[]): void {
    this._progresoMock.set(lista);
    localStorage.setItem(STORAGE_PROGRESO, JSON.stringify(lista));
  }

  private cargarPuntosLogros(): number {
    return Number(localStorage.getItem(STORAGE_PUNTOS_LOGROS) ?? 0);
  }

  private cargarNivelesCobrados(): Set<string> {
    const datos = localStorage.getItem(STORAGE_NIVELES_COBRADOS);
    return new Set(datos ? JSON.parse(datos) : []);
  }
}
