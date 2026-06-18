import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/* ============================================================
   RegistroComponent — Registro de usuario en 4 pasos

   Paso 1: Datos básicos (nombre, apellidos, usuario, email, contraseña)
   Paso 2: Experiencia en debate
   Paso 3: Club / institución
   Paso 4: Posición en debate
============================================================ */

export interface Club {
  id      : number;
  nombre  : string;
  tipo    : 'colegio' | 'universidad' | 'colegio_mayor' | 'otro';
}

export type Experiencia = 'ninguna' | 'menos1' | '1a3' | 'mas3' | null;
export type Posicion     = 'introductor' | 'refutador1' | 'refutador2' | 'conclusor' | 'noclear';
export type FiltroClub   = 'colegio' | 'universidad' | 'colegio_mayor' | 'otro';

/* Clubs hardcodeados — TODO: obtener del backend */
export const CLUBS: Club[] = [
  { id: 1, nombre: 'Club de Debate CEU San Pablo',    tipo: 'colegio'      },
  { id: 2, nombre: 'Club de Debate Colegio del Pilar',tipo: 'colegio'      },
  { id: 3, nombre: 'Club de Debate Comillas',         tipo: 'universidad'  },
  { id: 4, nombre: 'Club de Debate Nebrija',          tipo: 'universidad'  },
  { id: 5, nombre: 'Club de Debate UFV',              tipo: 'universidad'  },
  { id: 6, nombre: 'Club de Debate UAM',              tipo: 'universidad'  },
  { id: 7, nombre: 'Club de Debate Colegio Mayor Ximénez de Cisneros', tipo: 'colegio_mayor' },
  { id: 8, nombre: 'Club de Debate IES Ramiro de Maeztu', tipo: 'otro'    },
];

@Component({
  selector        : 'app-registro',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './registro.html',
  styleUrl        : './registro.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Registro {

  authService = inject(AuthService);
  router      = inject(Router);
  mostrarPassword = signal(false);
  posicion = signal<Posicion | null>(null);

  /* Paso activo (1–4) */
  pasoActual = signal(1);

  /* ── Paso 1 ── */
  nombre     = signal('');
  apellidos  = signal('');
  usuario    = signal('');
  email      = signal('');
  password   = signal('');
  errorPaso1 = signal('');

  /* ── Paso 2 ── */
  experiencia = signal<Experiencia>(null);

  // Mapeo de experiencia a integer
  private experienciaToInt(): number {
  const map: Record<string, number> = {
    ninguna: 0,
    menos1 : 1,
    '1a3'  : 2,
    mas3   : 3,
  };
  return map[this.experiencia() ?? 'ninguna'] ?? 0;
}

  /* ── Paso 3 ── */
  clubSeleccionado  = signal<Club | null>(null);
  filtroclubs       = signal<FiltroClub | null>(null);
  busquedaClub      = signal('');
  clubsFiltrados    = signal<Club[]>(CLUBS);

  /* ── Paso 4 ── */
  posiciones        = signal<Set<Posicion>>(new Set());

  /* Error global */
  error = signal('');

  /* ----------------------------------------------------------
     Navegación entre pasos
  ---------------------------------------------------------- */
  irAPaso(paso: number): void {
    if (paso < this.pasoActual()) {
      this.pasoActual.set(paso);
      return;
    }
    if (!this.validarPasoActual()) return;
    this.pasoActual.set(paso);
  }

  siguiente(): void {
    if (!this.validarPasoActual()) return;
    if (this.pasoActual() < 4) this.pasoActual.set(this.pasoActual() + 1);
  }

  volver(): void {
    if (this.pasoActual() > 1) this.pasoActual.set(this.pasoActual() - 1);
  }

  /* ----------------------------------------------------------
     Validación por paso
  ---------------------------------------------------------- */
  private validarPasoActual(): boolean {
    this.error.set('');
    this.errorPaso1.set('');

    if (this.pasoActual() === 1) {
      if (!this.nombre() || !this.apellidos() || !this.usuario() || !this.email() || !this.password()) {
        this.errorPaso1.set('Por favor, rellena todos los campos.');
        return false;
      }
      if (this.password().length < 6) {
        this.errorPaso1.set('La contraseña debe tener al menos 6 caracteres.');
        return false;
      }
      return true;
    }

    if (this.pasoActual() === 2) {
      if (!this.experiencia()) {
        this.error.set('Selecciona tu nivel de experiencia.');
        return false;
      }
      return true;
    }

    if (this.pasoActual() === 3) {
      if (!this.clubSeleccionado()) {
        this.error.set('Selecciona tu club o institución.');
        return false;
      }
      return true;
    }

    return true;
  }

  /* ----------------------------------------------------------
     Paso 3 — filtrado de clubs
  ---------------------------------------------------------- */
  setFiltroClub(filtro: FiltroClub | null): void {
    this.filtroclubs.set(filtro);
    this.aplicarFiltros();
  }

  buscarClub(texto: string): void {
    this.busquedaClub.set(texto);
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    let resultado = CLUBS;
    const filtro  = this.filtroclubs();
    const q       = this.busquedaClub().toLowerCase().trim();

    if (filtro) resultado = resultado.filter(c => c.tipo === filtro);
    if (q)      resultado = resultado.filter(c => c.nombre.toLowerCase().includes(q));

    this.clubsFiltrados.set(resultado);
  }

  seleccionarClub(club: Club): void {
    this.clubSeleccionado.set(club);
  }

  /* ----------------------------------------------------------
     Paso 4 — toggle de posiciones
  ---------------------------------------------------------- */
  seleccionarPosicion(pos: Posicion): void {
    this.posicion.set(pos);
  }

  tienePosicion(pos: Posicion): boolean {
    return this.posicion() === pos;
  }

  /* ----------------------------------------------------------
     Finalizar registro
  ---------------------------------------------------------- */
  finalizar(): void {
    const resultado = this.authService.registrar({
      nombre      : this.nombre(),
      apellidos   : this.apellidos(),
      username    : this.usuario(),
      email       : this.email(),
      password    : this.password(),
      experiencia : this.experienciaToInt(),
      posicion    : this.posicion() ?? '',
    });

    if (!resultado.ok) {
      this.error.set(resultado.error || 'Error al registrar.');
      return;
    }

    this.router.navigate(['/']);
  }

  /* ----------------------------------------------------------
     Helper — etiqueta legible del tipo de club
  ---------------------------------------------------------- */
  tipoClubLabel(tipo: string): string {
    const map: Record<string, string> = {
      colegio      : 'Colegio',
      universidad  : 'Universidad',
      colegio_mayor: 'Colegio Mayor',
      otro         : 'Otro',
    };
    return map[tipo] ?? tipo;
  }
}
