import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DebateService, TemaApi } from '../../../../core/services/debate.service';
import { PreguntonService } from '../../../../core/services/pregunton.service';

const STORAGE_VOTO = 'pregunton_voto';

interface VotoGuardado {
  preguntaId: number;
  fecha     : string;
  corazones : number;
}

@Component({
  selector        : 'app-pregunton-diario',
  standalone      : true,
  imports         : [],
  templateUrl     : './pregunton-diario.html',
  styleUrl        : './pregunton-diario.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class PreguntonDiario implements OnInit {

  private debateService   = inject(DebateService);   // solo para getTemas()
  private preguntonService = inject(PreguntonService);
  private router           = inject(Router);

  cargando   = signal(true);
  errorCarga = signal(false);

  preguntaHoy = signal<TemaApi | null>(null);
  ranking     = signal<TemaApi[]>([]);

  ngOnInit(): void {
    this.debateService.getTemas().subscribe({
      next: temas => {
        console.log('TEMAS RECIBIDOS:', temas);
        this.preguntaHoy.set(this.preguntonService.getPreguntaDelDia(temas));
        this.ranking.set(this.preguntonService.getRanking(temas));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
    });
  }

  seleccion    = signal<number>(0);
  votoGuardado = signal<VotoGuardado | null>(this.cargarVotoHoy());
  yaVotado     = computed(() => this.votoGuardado() !== null);

  corazonesMostrados = computed(() =>
    this.yaVotado() ? this.votoGuardado()!.corazones : this.seleccion()
  );

  seleccionar(n: number): void {
    if (this.yaVotado()) return;
    this.seleccion.set(n);
  }

  enviarVoto(): void {
    if (this.yaVotado() || !this.preguntaHoy()) return;

    const pregunta  = this.preguntaHoy()!;
    const corazones = this.seleccion();

    const voto: VotoGuardado = {
      preguntaId: pregunta.id!,
      fecha     : this.fechaHoy(),
      corazones,
    };

    localStorage.setItem(STORAGE_VOTO, JSON.stringify(voto));
    this.votoGuardado.set(voto);

    // Actualización optimista — ver TODO en PreguntonService.votar()
    this.preguntaHoy.update(p => p ? { ...p, likes: (p.likes ?? 0) + corazones } : p);
    this.ranking.update(lista =>
      lista
        .map(t => t.id === pregunta.id ? { ...t, likes: (t.likes ?? 0) + corazones } : t)
        .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    );
  }

  volverAlHub(): void {
    this.router.navigate(['/retos']);
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  private cargarVotoHoy(): VotoGuardado | null {
    const datos = localStorage.getItem(STORAGE_VOTO);
    if (!datos) return null;
    const voto = JSON.parse(datos) as VotoGuardado;
    return voto.fecha === this.fechaHoy() ? voto : null;
  }

  corazonesRanking(likes: number): boolean[] {
    return this.preguntonService.corazonesVisual(likes);
  }

  medallaClase(posicion: number): string {
    if (posicion === 1) return 'oro';
    if (posicion === 2) return 'plata';
    if (posicion === 3) return 'bronce';
    return '';
  }

  iniciales(tema: TemaApi): string {
    const nombre = tema.usuario?.username ?? tema.usuario?.nombre ?? '??';
    return nombre.replace('@', '').slice(0, 2).toUpperCase();
  }
}
