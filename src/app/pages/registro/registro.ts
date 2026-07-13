import { Component, signal, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClubsService, Club } from '../../core/services/clubs.service';
import { Particles } from '../../shared/components/particles/particles';

/* ============================================================
   RegistroComponent — Registro de usuario en 4 pasos

   Paso 1: Datos básicos (nombre, apellidos, usuario, email, contraseña)
   Paso 2: Experiencia en debate
   Paso 3: Club / institución (datos reales del backend)
   Paso 4: Posición en debate
============================================================ */

export type Experiencia = 'ninguna' | 'menos1' | '1a3' | 'mas3' | null;
export type Posicion    = 'introductor' | 'refutador1' | 'refutador2' | 'conclusor' | 'noclear';

@Component({
  selector        : 'app-registro',
  standalone      : true,
  imports         : [RouterLink, Particles],
  templateUrl     : './registro.html',
  styleUrl        : './registro.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class Registro {

  authService  = inject(AuthService);
  clubsService = inject(ClubsService);
  router       = inject(Router);

  mostrarPassword = signal(false);
  cargando        = signal(false);

  /* Paso activo (1–4) */
  pasoActual = signal(1);

  /* ── Paso 1 ── */
  nombre     = signal('');
  apellidos  = signal('');
  usuario    = signal('');
  email      = signal('');
  password   = signal('');
  errorPaso1 = signal('');
  imagenPerfil       = signal<File | null>(null);
  imagenPerfilPreview = signal<string | null>(null);

  /* ----------------------------------------------------------
   seleccionarImagen()
   Guarda el archivo elegido y genera una vista previa
  ---------------------------------------------------------- */
  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorPaso1.set('El archivo debe ser una imagen.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorPaso1.set('La imagen no puede superar los 5 MB.');
      return;
    }

    this.imagenPerfil.set(file);

    const reader = new FileReader();
    reader.onload = () => this.imagenPerfilPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  quitarImagen(): void {
    this.imagenPerfil.set(null);
    this.imagenPerfilPreview.set(null);
  }

  /* ── Paso 2 ── */
  experiencia = signal<Experiencia>(null);

  private experienciaToInt(): number {
    const map: Record<string, number> = {
      ninguna: 0,
      menos1 : 1,
      '1a3'  : 2,
      mas3   : 3,
    };
    return map[this.experiencia() ?? 'ninguna'] ?? 0;
  }

  /* ── Paso 3 — Clubs reales del backend ── */
  clubs            = signal<Club[]>([]);
  cargandoClubs    = signal(false);
  errorClubs       = signal(false);
  clubSeleccionado = signal<Club | null>(null);
  busquedaClub     = signal('');

  clubsFiltrados = computed(() => {
    const q = this.busquedaClub().toLowerCase().trim();
    if (!q) return this.clubs();
    return this.clubs().filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.institucion?.toLowerCase().includes(q)
    );
  });

  /* ── Paso 4 ── */
  posicion = signal<Posicion | null>(null);

  /* Error global */
  error = signal('');

  constructor() {
    this.cargarClubs();
  }

  /* ----------------------------------------------------------
     cargarClubs()
     Obtiene los clubs reales del backend
  ---------------------------------------------------------- */
  private cargarClubs(): void {
    this.cargandoClubs.set(true);
    this.errorClubs.set(false);

    this.clubsService.getClubs().subscribe({
      next: clubs => {
        this.clubs.set(clubs);
        this.cargandoClubs.set(false);
      },
      error: () => {
        this.errorClubs.set(true);
        this.cargandoClubs.set(false);
      }
    });
  }

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
        return true;
      }
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
        return true;
      }
    }
    return true;
  }

    omitirClub(): void {
      this.clubSeleccionado.set(null);
    }

  /* ----------------------------------------------------------
     Paso 3 — búsqueda y selección de club
  ---------------------------------------------------------- */
  buscarClub(texto: string): void {
    this.busquedaClub.set(texto);
  }

  seleccionarClub(club: Club): void {
    this.clubSeleccionado.set(club);
  }

  /* ----------------------------------------------------------
     Paso 4 — selección de posición
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
    this.error.set('');
    this.cargando.set(true);

    const club = this.clubSeleccionado();

    this.authService.registrar({
      nombre      : this.nombre(),
      apellidos   : this.apellidos(),
      username    : this.usuario(),
      email       : this.email(),
      password    : this.password(),
      experiencia : this.experienciaToInt(),
      posicion    : this.posicion() ?? '',
      clubs       : club ? [{ id: club.id }] : [],
    }, this.imagenPerfil()).subscribe(resultado => {
      this.cargando.set(false);

      if (!resultado.ok) {
        this.error.set(resultado.error || 'Error al registrar.');
        return;
      }

      this.router.navigate(['/']);
    });
  }
}
