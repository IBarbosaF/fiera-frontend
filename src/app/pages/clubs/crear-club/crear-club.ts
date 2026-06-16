import { Component, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink }                                     from '@angular/router';
import { CommonModule }                                           from '@angular/common';
import { ClubsService } from '../../../core/services/clubs.service';

// ── Tipos ──────────────────────────────────────────────────────────────────
export type TipoInstitucion = 'colegio' | 'colegio_mayor' | 'universidad' | 'asociacion' | 'otro';
export type TamanoClub      = '0-15' | '16-50' | '51-100' | '101-300' | '301-500' | '500+';
export type FrecuenciaForm  = 'semanal' | 'mensual' | 'puntual' | 'nunca';

// ── Componente ─────────────────────────────────────────────────────────────
@Component({
  selector        : 'app-crear-club',
  standalone      : true,
  imports         : [CommonModule, RouterLink],
  templateUrl     : './crear-club.html',
  styleUrl        : './crear-club.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class CrearClub {

    private router = inject(Router)
    private clubsService = inject(ClubsService)


  // ── Stepper ──────────────────────────────────────────────────────────────
  pasoActual = signal<number>(1);
  readonly TOTAL_PASOS = 7;

  // ── Paso 1 — Información básica ──────────────────────────────────────────
  nombreClub  = signal<string>('');
  siglasClub  = signal<string>('');

  // ── Paso 2 — Tipo de institución ─────────────────────────────────────────
  tipoSeleccionado = signal<TipoInstitucion | null>(null);

  readonly TIPOS: { valor: TipoInstitucion; nombre: string; desc: string }[] = [
    { valor: 'colegio',       nombre: 'Colegio',       desc: 'Club de un centro escolar'         },
    { valor: 'colegio_mayor', nombre: 'Colegio Mayor', desc: 'Club de un colegio mayor'           },
    { valor: 'universidad',   nombre: 'Universidad',   desc: 'Club universitario'                 },
    { valor: 'asociacion',    nombre: 'Asociación',    desc: 'Asociación u organización de debate'},
    { valor: 'otro',          nombre: 'Otro',          desc: 'No encaja en las anteriores'        },
  ];

  // ── Paso 3 — Imagen ───────────────────────────────────────────────────────
  imagenPreview = signal<string | null>(null);
  imagenArchivo = signal<File | null>(null);

  // ── Paso 4 — Ubicación ────────────────────────────────────────────────────
  pais        = signal<string>('España');
  comunidad   = signal<string>('');
  provincia   = signal<string>('');
  ciudad      = signal<string>('');
  direccion   = signal<string>('');

  readonly COMUNIDADES = [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
    'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Extremadura', 'Galicia',
    'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco', 'Valencia', 'Ceuta', 'Melilla',
  ];

  // ── Paso 5 — Tamaño ───────────────────────────────────────────────────────
  tamanoSeleccionado = signal<TamanoClub | null>(null);

  readonly TAMANOS: { valor: TamanoClub; label: string }[] = [
    { valor: '0-15',    label: '0 - 15'          },
    { valor: '16-50',   label: '16 - 50'          },
    { valor: '51-100',  label: '51 - 100'         },
    { valor: '101-300', label: '101 - 300'        },
    { valor: '301-500', label: '301 - 500'        },
    { valor: '500+',    label: 'Más de 500'       },
  ];

  // ── Paso 6 — Frecuencia de formaciones ───────────────────────────────────
  frecuenciaSeleccionada = signal<FrecuenciaForm | null>(null);

  readonly FRECUENCIAS: { valor: FrecuenciaForm; nombre: string; desc: string }[] = [
    { valor: 'semanal',  nombre: '1 o más horas semanales', desc: 'Formación regular y continua'    },
    { valor: 'mensual',  nombre: 'Mensualmente',            desc: 'Formación una vez al mes'        },
    { valor: 'puntual',  nombre: 'Puntualmente',            desc: 'Formaciones ocasionales'         },
    { valor: 'nunca',    nombre: 'Nunca',                   desc: 'No recibimos formaciones'        },
  ];

  // ── Errores ───────────────────────────────────────────────────────────────
  error = signal<string>('');

  // ── Computed: resumen para paso 7 ────────────────────────────────────────
  tipoLabel = computed(() => {
    const t = this.TIPOS.find(x => x.valor === this.tipoSeleccionado());
    return t?.nombre ?? '—';
  });

  ubicacionLabel = computed(() => {
    const partes = [this.ciudad(), this.comunidad()].filter(Boolean);
    return partes.length ? partes.join(', ') : '—';
  });

  tamanoLabel = computed(() => {
    const t = this.TAMANOS.find(x => x.valor === this.tamanoSeleccionado());
    return t ? `${t.label} debatientes` : '—';
  });

  frecuenciaLabel = computed(() => {
    const f = this.FRECUENCIAS.find(x => x.valor === this.frecuenciaSeleccionada());
    return f?.nombre ?? '—';
  });

  // ── Navegación ────────────────────────────────────────────────────────────
  irAPaso(paso: number): void {
    if (paso < this.pasoActual()) {
      this.error.set('');
      this.pasoActual.set(paso);
    }
  }

  siguiente(): void {
    this.error.set('');

    if (!this.validarPasoActual()) return;

    if (this.pasoActual() < this.TOTAL_PASOS) {
      this.pasoActual.set(this.pasoActual() + 1);
    }
  }

  anterior(): void {
    this.error.set('');
    if (this.pasoActual() > 1) {
      this.pasoActual.set(this.pasoActual() - 1);
    }
  }

  // ── Validación por paso ───────────────────────────────────────────────────
  private validarPasoActual(): boolean {
    switch (this.pasoActual()) {
      case 1:
        if (!this.nombreClub().trim()) {
          this.error.set('El nombre del club es obligatorio.');
          return false;
        }
        return true;

      case 2:
        if (!this.tipoSeleccionado()) {
          this.error.set('Selecciona el tipo de institución.');
          return false;
        }
        return true;

      case 3:
        // Imagen opcional — se puede continuar sin ella
        return true;

      case 4:
        if (!this.comunidad() || !this.ciudad()) {
          this.error.set('Indica al menos la comunidad autónoma y la ciudad.');
          return false;
        }
        return true;

      case 5:
        if (!this.tamanoSeleccionado()) {
          this.error.set('Selecciona el tamaño del club.');
          return false;
        }
        return true;

      case 6:
        if (!this.frecuenciaSeleccionada()) {
          this.error.set('Selecciona la frecuencia de formaciones.');
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  // ── Paso 3: manejar imagen ────────────────────────────────────────────────
  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.imagenArchivo.set(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagenPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  eliminarImagen(): void {
    this.imagenPreview.set(null);
    this.imagenArchivo.set(null);
  }

  // ── Estado de envío ───────────────────────────────────────────────────────
    enviando = signal(false);

  // ── Finalizar: crear club ─────────────────────────────────────────────────
  crearClub(): void {
    this.enviando.set(true);
    this.error.set('');

    const nuevoClub = {
      nombre     : this.nombreClub(),
      siglas     : this.siglasClub(),
      institucion: this.tipoSeleccionado() ?? '',
      usuarios   : []
    };

    this.clubsService.crearClub(nuevoClub).subscribe({
      next: (club) => {
        this.enviando.set(false);
        this.router.navigate(['/clubs', club.id]);
      },
      error: () => {
        this.enviando.set(false);
        this.error.set('No se pudo crear el club. Inténtalo de nuevo.');
      }
    });
  }
}
