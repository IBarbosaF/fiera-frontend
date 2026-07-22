// src/app/pages/retos/retos-clash/clash-diario/clash-diario.ts

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DebateService } from '../../../../core/services/debate.service';
import { ClashService, ClashApi, ClashIntervencionApi } from '../../../../core/services/clash.service';

/* ============================================================
   ClashDiario — Reto: encontrar el clash más importante

   Conectado a ClashService (backend real). Solo modo Fácil
   funcional — el modo Difícil se muestra bloqueado con un
   aviso "Próximamente", según confirmó backend (María Rosa):
   la IA ya genera el clash completo con argumentos, pero la
   evaluación de texto libre (modo difícil) aún no está hecha.

   El bloqueo diario se mantiene en localStorage (no confirmado
   si el backend ya distingue "ya respondido" por usuario en el
   propio Clash — hasta confirmarlo, replicamos el mismo patrón
   que Careo/Preguntón).
============================================================ */

const STORAGE_COMPLETADO = 'clash_reto_completado';

type ModoClash = 'facil' | 'dificil';

interface ClashCompletado {
  fecha        : string;
  aciertoFavor : boolean;
  aciertoContra: boolean;
  puntos       : number;
  feedback     : string;
}

@Component({
  selector        : 'app-clash-diario',
  standalone      : true,
  imports         : [],
  templateUrl     : './clash-diario.html',
  styleUrl        : './clash-diario.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClashDiario implements OnInit {

  private debateService = inject(DebateService);
  private clashService  = inject(ClashService);
  private router        = inject(Router);

  /* ── Estado de carga inicial ── */
  cargando   = signal(true);
  errorCarga = signal(false);

  /* ── Clash de hoy, tal como llega del backend ── */
  clashActual = signal<ClashApi | null>(null);

  /** Pregunta del día, sacada del propio clash */
  pregunta = computed(() => this.clashActual()?.debate?.temaElegido ?? '');

  /** Argumentos ya separados por postura para pintarlos en columnas.
      Asunción: postura viene como 'pro'/'contra' (mismo enum que
      usa el resto de intervenciones de debate) — si el backend
      real usa otros valores, solo hay que ajustar este filtro. */
  favorArgs = computed<ClashIntervencionApi[]>(() =>
    (this.clashActual()?.debate?.intervenciones ?? []).filter(i => i.postura !== 'contra')
  );
  contraArgs = computed<ClashIntervencionApi[]>(() =>
    (this.clashActual()?.debate?.intervenciones ?? []).filter(i => i.postura === 'contra')
  );

  /* ── Bloqueo diario ── */
  completadoHoy = signal<ClashCompletado | null>(this.cargarCompletadoHoy());

  /* ── Modo — Fácil funcional, Difícil bloqueado ── */
  modo = signal<ModoClash>('facil');

  cambiarModo(m: ModoClash): void {
    if (m === 'dificil') return; // próximamente — el botón no hace nada aún
    this.modo.set(m);
  }

  /* ── Selección modo fácil ── */
  favorSeleccionado  = signal<number | null>(null);
  contraSeleccionado = signal<number | null>(null);

  seleccionarFavor(id: number): void {
    if (this.enviado()) return;
    this.favorSeleccionado.set(id);
  }

  seleccionarContra(id: number): void {
    if (this.enviado()) return;
    this.contraSeleccionado.set(id);
  }

  puedeComprobar = computed(() =>
    this.favorSeleccionado() !== null && this.contraSeleccionado() !== null
  );

  /* ── Envío y resultado ── */
  enviado   = signal(false);
  enviando  = signal(false);
  resultado = signal<{ aciertoFavor: boolean; aciertoContra: boolean; puntos: number; feedback: string } | null>(null);

  /* ──────────────────────────────────────────────────────────
     CARGA INICIAL
  ────────────────────────────────────────────────────────── */
  ngOnInit(): void {
    if (this.completadoHoy()) {
      this.cargando.set(false);
      return;
    }

    this.debateService.getTemas().subscribe({
      next: temas => {
        this.clashService.obtenerOCrearClashDeHoy(temas).subscribe({
          next: clash => {
            this.clashActual.set(clash);
            this.cargando.set(false);
          },
          error: () => {
            this.errorCarga.set(true);
            this.cargando.set(false);
          }
        });
      },
      error: () => {
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     COMPROBAR — modo fácil
  ────────────────────────────────────────────────────────── */
  comprobar(): void {
    if (!this.puedeComprobar() || this.enviando()) return;

    const clash = this.clashActual();
    if (!clash) return;

    const favorId  = this.favorSeleccionado()!;
    const contraId = this.contraSeleccionado()!;

    const correctos     = clash.mejorClashId ?? [];
    const aciertoFavor  = correctos.includes(favorId);
    const aciertoContra = correctos.includes(contraId);
    const aciertos      = Number(aciertoFavor) + Number(aciertoContra);
    const puntos        = aciertos === 2 ? 10 : aciertos === 1 ? 5 : 0;

    this.enviando.set(true);

    this.clashService.responderClash(clash.id, favorId, contraId).subscribe({
      next: res => {
        const feedback = res?.feedback ?? 'FIERA no ha devuelto explicación esta vez.';
        this.finalizar(aciertoFavor, aciertoContra, puntos, feedback);
      },
      error: () => {
        // Si falla el PUT no bloqueamos al usuario: el resultado
        // ya se calculó localmente con mejorClashId, así que se
        // muestra igual, solo que sin persistir en backend.
        this.finalizar(aciertoFavor, aciertoContra, puntos,
          'No se ha podido guardar tu respuesta en el servidor, pero aquí tienes el resultado.');
      }
    });
  }

  private finalizar(aciertoFavor: boolean, aciertoContra: boolean, puntos: number, feedback: string): void {
    this.resultado.set({ aciertoFavor, aciertoContra, puntos, feedback });
    this.enviado.set(true);
    this.enviando.set(false);
    this.guardarCompletadoHoy(aciertoFavor, aciertoContra, puntos, feedback);
  }

  /* ──────────────────────────────────────────────────────────
     BLOQUEO DIARIO — localStorage
  ────────────────────────────────────────────────────────── */
  private cargarCompletadoHoy(): ClashCompletado | null {
    const datos = localStorage.getItem(STORAGE_COMPLETADO);
    if (!datos) return null;
    const guardado = JSON.parse(datos) as ClashCompletado;
    return guardado.fecha === this.fechaHoy() ? guardado : null;
  }

  private guardarCompletadoHoy(aciertoFavor: boolean, aciertoContra: boolean, puntos: number, feedback: string): void {
    const registro: ClashCompletado = { fecha: this.fechaHoy(), aciertoFavor, aciertoContra, puntos, feedback };
    localStorage.setItem(STORAGE_COMPLETADO, JSON.stringify(registro));
    this.completadoHoy.set(registro);
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  /* ──────────────────────────────────────────────────────────
     HELPERS DE PLANTILLA
  ────────────────────────────────────────────────────────── */
  volverAlHub(): void {
    this.router.navigate(['/retos']);
  }

  esCorrecto(id: number): boolean {
    return this.clashActual()?.mejorClashId?.includes(id) ?? false;
  }
}
