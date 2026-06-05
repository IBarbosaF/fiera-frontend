import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DebateService, TemaApi } from '../../core/services/debate.service';

/* ============================================================
   ConfigDebateComponent — Configuración del debate

   Gestiona 5 secciones mediante un sidebar de navegación:
   1. Configuración  → tiempos, dificultad, modo, postura
   2. Tema           → banco de temas o entrada manual
   3. FIERA          → personalidad del avatar
   4. Turnos         → asignación de turnos por intervención
   5. Resumen        → revisión final + iniciar debate

   El estado se centraliza en DebateService para que
   persista entre secciones y esté disponible en debate.ts
============================================================ */

/* Tipo para las secciones del sidebar */
export type SeccionDebate = 'configuracion' | 'tema' | 'fiera' | 'turnos' | 'resumen';

@Component({
  selector         : 'app-config-debate',
  standalone       : true,
  imports          : [],
  templateUrl      : './config-debate.html',
  styleUrl         : './config-debate.css',
  changeDetection  : ChangeDetectionStrategy.OnPush
})
export class ConfigDebate implements OnInit {

  /* Servicios inyectados */
  debateService = inject(DebateService);
  router        = inject(Router);

  /* Sección activa del sidebar */
  seccionActiva = signal<SeccionDebate>('configuracion');

  /* Temas disponibles */
  temas            = signal<TemaApi[]>([]);
  temasFiltrados   = signal<TemaApi[]>([]);
  temaSeleccionado = signal<TemaApi | null>(null);
  cargandoTemas    = signal(false);
  errorTemas       = signal(false);

  /* Pestaña activa en sección Tema */
  pestanaActiva = signal<'banco' | 'manual'>('banco');

  /* Campos de tema manual */
  temaManual     = signal('');
  enunciadoManual = signal('');

  /* ── Getters del config para el template ── */
  get config() { return this.debateService.config(); }

  /* ----------------------------------------------------------
     ngOnInit — Cargar temas del backend
  ---------------------------------------------------------- */
  ngOnInit(): void {
    this.cargarTemas();
  }

  /* ----------------------------------------------------------
     cargarTemas()
     Obtiene los temas del backend y los almacena en signals
  ---------------------------------------------------------- */
  cargarTemas(): void {
    this.cargandoTemas.set(true);
    this.errorTemas.set(false);

    this.debateService.getTemas().subscribe({
      next: (temas) => {
        this.temas.set(temas);
        this.temasFiltrados.set(temas);
        this.cargandoTemas.set(false);
      },
      error: () => {
        this.errorTemas.set(true);
        this.cargandoTemas.set(false);
      }
    });
  }

  /* ----------------------------------------------------------
     navegarA(seccion)
     Cambia la sección activa del sidebar
  ---------------------------------------------------------- */
  navegarA(seccion: SeccionDebate): void {
    if (seccion === 'resumen') this.prepararResumen();
    this.seccionActiva.set(seccion);
  }

  siguiente(): void {
    const orden: SeccionDebate[] = ['configuracion', 'tema', 'fiera', 'turnos', 'resumen'];
    const actual = orden.indexOf(this.seccionActiva());
    if (actual < orden.length - 1) this.navegarA(orden[actual + 1]);
  }

  volver(): void {
    const orden: SeccionDebate[] = ['configuracion', 'tema', 'fiera', 'turnos', 'resumen'];
    const actual = orden.indexOf(this.seccionActiva());
    if (actual > 0) this.navegarA(orden[actual - 1]);
  }

  /* ----------------------------------------------------------
     Sección CONFIGURACIÓN
  ---------------------------------------------------------- */
  actualizarTiempo(campo: string, accion: 'sumar' | 'restar'): void {
    const tiempos = { ...this.config.tiempos };
    const key = campo as keyof typeof tiempos;
    if (accion === 'sumar'  && tiempos[key] < 15) tiempos[key]++;
    if (accion === 'restar' && tiempos[key] > 1)  tiempos[key]--;
    this.debateService.actualizarConfig({ tiempos });
  }

  setDificultad(valor: string): void {
    this.debateService.actualizarConfig({
      dificultad: valor as 'basico' | 'medio' | 'avanzado'
    });
  }

  setModo(valor: string): void {
    this.debateService.actualizarConfig({
      modo: valor as 'completo' | 'express'
    });
  }

  setPostura(valor: string): void {
    this.debateService.actualizarConfig({
      postura: valor as 'favor' | 'contra' | 'aleatoria'
    });
  }

  /* ----------------------------------------------------------
     Sección TEMA
  ---------------------------------------------------------- */
  buscarTema(texto: string): void {
    const q = texto.toLowerCase().trim();
    this.temasFiltrados.set(
      q ? this.temas().filter(t =>
        t.enunciado.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q)
      ) : this.temas()
    );
  }

  seleccionarTema(tema: TemaApi): void {
    this.temaSeleccionado.set(tema);
    this.debateService.actualizarConfig({
      tema: { id: tema.id, enunciado: tema.enunciado, categoria: tema.categoria }
    });
  }

  temaAleatorio(): void {
    const lista = this.temas();
    if (!lista.length) return;
    const aleatorio = lista[Math.floor(Math.random() * lista.length)];
    this.seleccionarTema(aleatorio);
  }

  actualizarTemaManual(): void {
    if (this.temaManual() && this.enunciadoManual()) {
      this.debateService.actualizarConfig({
        tema: {
          enunciado: this.enunciadoManual(),
          categoria: this.temaManual(),
          manual   : true
        }
      });
    }
  }

  /* ----------------------------------------------------------
     Sección FIERA
  ---------------------------------------------------------- */
  setPersonalidad(valor: string): void {
    this.debateService.actualizarConfig({
      personalidad: valor as 'agresiva' | 'elegante' | 'sarcastica'
    });
  }

  /* ----------------------------------------------------------
     Sección TURNOS
  ---------------------------------------------------------- */
  setTurno(campo: string, valor: 'equipo' | 'fiera'): void {
    const turnos = { ...this.config.turnos };
    (turnos as any)[campo] = valor;
    this.debateService.actualizarConfig({ turnos });
  }

  /* ----------------------------------------------------------
     Sección RESUMEN
  ---------------------------------------------------------- */
  prepararResumen(): void {
    /* El resumen lee directamente del DebateService */
  }

  /* ----------------------------------------------------------
     iniciarDebate()
     Guarda la config y navega a la pantalla del debate
     TODO: enviar config al backend cuando esté disponible
  ---------------------------------------------------------- */
  iniciarDebate(): void {
    this.debateService.guardarConfig();
    this.router.navigate(['/debate']);
  }

  /* ----------------------------------------------------------
     Helpers para el template
  ---------------------------------------------------------- */
  formatearTiempo(minutos: number): string {
    return `${String(minutos).padStart(2, '0')}:00`;
  }

  textoPostura(): string {
    const map = { favor: 'A favor', contra: 'En contra', aleatoria: 'Aleatoria' };
    return map[this.config.postura];
  }

  textoDificultad(): string {
    const map = { basico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
    return map[this.config.dificultad];
  }

  textoModo(): string {
    const map = { completo: 'Debate completo', express: 'Debate express' };
    return map[this.config.modo];
  }

  textoPersonalidad(): string {
    const map = { agresiva: 'Agresiva', elegante: 'Elegante', sarcastica: 'Sarcástica' };
    return this.config.personalidad ? map[this.config.personalidad] : '—';
  }

  /* ----------------------------------------------------------
   Helpers para acceder a tipos dinámicos desde el template
   Evitan los castings 'as keyof' en el HTML
  ---------------------------------------------------------- */
  getTiempo(campo: string): number {
    return this.config.tiempos[campo as keyof typeof this.config.tiempos];
  }

  getTurno(campo: string): string {
    return this.config.turnos[campo as keyof typeof this.config.turnos];
  }
}
