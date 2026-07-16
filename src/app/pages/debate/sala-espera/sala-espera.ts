import {
  Component, inject, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DebateService } from '../../../core/services/debate.service';

/* ============================================================
   SalaEspera — Pantalla del creador esperando a que se unan
   los invitados antes de arrancar el debate.

   Flujo:
   1. El debate ya existe en el backend (creado en crear-debate)
      con usuariosInvitados = [creador, compañero...]
   2. Sondeamos GET /debates/{id} cada 2s comparando
      usuariosInvitados vs usuarios, hasta 3 minutos máximo
   3. Si se unen todos → POST /start → partida-debate
   4. Si se agota el tiempo → el creador decide: continuar solo
      (quita a los que faltan con PUT /update) o cancelar
============================================================ */

const INTERVALO_REINTENTO_MS = 2000;
const MAX_INTENTOS           = 90; /* 90 x 2s = 3 minutos */

type EstadoSala = 'esperando' | 'listo' | 'timeout' | 'error' | 'iniciando';

interface InvitadoEstado {
  id     : number;
  nombre : string;
  unido  : boolean;
}

@Component({
  selector        : 'app-sala-espera',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './sala-espera.html',
  styleUrl        : './sala-espera.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class SalaEspera implements OnInit, OnDestroy {

  private debateService = inject(DebateService);
  private router        = inject(Router);
  private cdr            = inject(ChangeDetectorRef);

  estado        = signal<EstadoSala>('esperando');
  invitados     = signal<InvitadoEstado[]>([]);
  intentoActual = signal(0);
  errorMensaje  = signal('');

  private debateId: number | null = null;
  private intervaloReintento: ReturnType<typeof setInterval> | null = null;

  get progresoEspera(): number {
    return Math.min(100, Math.round((this.intentoActual() / MAX_INTENTOS) * 100));
  }

  get tiempoTranscurrido(): string {
    const segundos = this.intentoActual() * (INTERVALO_REINTENTO_MS / 1000);
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  get codigoSesion(): string {
    return this.debateService.getCodigoSesion() ?? '';
  }

  get enlaceCompartir(): string {
    return this.debateService.construirEnlaceDebate(this.codigoSesion);
  }

  get todosUnidos(): boolean {
    return this.invitados().length > 0 && this.invitados().every(i => i.unido);
  }

  ngOnInit(): void {
    this.debateId = this.debateService.getDebateId();
    if (!this.debateId) {
      this.estado.set('error');
      this.errorMensaje.set('No se encontró el debate. Vuelve a intentarlo desde el inicio.');
      return;
    }
    this.consultarEstado();
    this.intervaloReintento = setInterval(() => this.tick(), INTERVALO_REINTENTO_MS);
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  private tick(): void {
    this.intentoActual.update(n => n + 1);
    this.cdr.markForCheck();

    if (this.intentoActual() >= MAX_INTENTOS) {
      this.detenerPolling();
      this.estado.set('timeout');
      this.cdr.markForCheck();
      return;
    }

    this.consultarEstado();
  }

  /* ----------------------------------------------------------
     consultarEstado()
     GET /debates/{id} y compara usuariosInvitados vs usuarios
  ---------------------------------------------------------- */
  private consultarEstado(): void {
    if (!this.debateId) return;

    this.debateService.obtenerDebateCompleto(this.debateId).subscribe({
      next: (debate) => {
        const invitados: InvitadoEstado[] = (debate?.usuariosInvitados ?? []).map((u: any) => ({
          id    : u.id,
          nombre: u.nombre ?? u.username ?? `Usuario ${u.id}`,
          unido : (debate?.usuarios ?? []).some((x: any) => x.id === u.id)
        }));
        this.invitados.set(invitados);
        this.cdr.markForCheck();

        if (invitados.length > 0 && invitados.every(i => i.unido)) {
          this.detenerPolling();
          this.arrancarDebate();
        }
      },
      error: () => {
        /* Un fallo puntual de red no debe abortar la espera —
           seguimos reintentando hasta el timeout */
      }
    });
  }

  /* ----------------------------------------------------------
     arrancarDebate()
     Todos los invitados se han unido — llama a /start y navega
  ---------------------------------------------------------- */
  private arrancarDebate(): void {
    if (!this.debateId) return;
    this.estado.set('iniciando');
    this.cdr.markForCheck();

    this.debateService.iniciarDebate(this.debateId).subscribe({
      next : () => this.router.navigate(['/partida-debate']),
      error: () => {
        this.estado.set('error');
        this.errorMensaje.set('No se pudo iniciar el debate. Inténtalo de nuevo.');
        this.cdr.markForCheck();
      }
    });
  }

  /* Cancelar del todo — vuelve al wizard. El debate queda
     creado pero sin arrancar en el backend (no navegable). */
  cancelarYVolver(): void {
    this.detenerPolling();
    this.router.navigate(['/crear-debate']);
  }

  copiarCodigo(): void {
    navigator.clipboard?.writeText(this.codigoSesion).catch(() => {});
  }

  private detenerPolling(): void {
    if (this.intervaloReintento) {
      clearInterval(this.intervaloReintento);
      this.intervaloReintento = null;
    }
  }
}
