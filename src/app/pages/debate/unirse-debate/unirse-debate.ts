import {
  Component, inject, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DebateService } from '../../../core/services/debate.service';

/* ============================================================
   UnirseDebate — Pantalla para unirse a un debate existente
   mediante código de invitación (o enlace, que incluye el
   código en la propia URL).

   Flujo:
   1. El código puede llegar por la URL (/unirse-debate/:codigo)
      o escribirse manualmente.
   2. Si el backend responde 404 ("No existe un debate con ese
      código"), puede deberse a que el anfitrión aún no ha
      terminado el wizard (el debate no se crea hasta el último
      paso) — así que entramos en modo espera con reintentos
      automáticos cada 2s, hasta un máximo de 3 minutos.
   3. Si el backend responde con éxito, guardamos el debate y
      navegamos a partida-debate.
============================================================ */

const INTERVALO_REINTENTO_MS = 2000;
const MAX_INTENTOS           = 90; /* 90 x 2s = 3 minutos */

type EstadoUnirse = 'inicial' | 'buscando' | 'esperando' | 'error' | 'exito';

@Component({
  selector        : 'app-unirse-debate',
  standalone      : true,
  imports         : [RouterLink],
  templateUrl     : './unirse-debate.html',
  styleUrl        : './unirse-debate.css',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class UnirseDebate implements OnInit, OnDestroy {

  private debateService = inject(DebateService);
  private router        = inject(Router);
  private route          = inject(ActivatedRoute);
  private cdr            = inject(ChangeDetectorRef);

  estado         = signal<EstadoUnirse>('inicial');
  codigoInput    = signal('');
  intentoActual  = signal(0);
  errorMensaje   = signal('');

  private intervaloReintento: ReturnType<typeof setInterval> | null = null;

  /* Progreso en % para la barra de espera, basado en intentos */
  get progresoEspera(): number {
    return Math.min(100, Math.round((this.intentoActual() / MAX_INTENTOS) * 100));
  }

  get tiempoTranscurrido(): string {
    const segundos = this.intentoActual() * (INTERVALO_REINTENTO_MS / 1000);
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    /* Si el código viene en la URL, lo autocompletamos y
       lanzamos la búsqueda automáticamente */
    const codigoUrl = this.route.snapshot.paramMap.get('codigo');
    if (codigoUrl) {
      this.codigoInput.set(codigoUrl.toUpperCase());
      this.intentarUnirse();
    }
  }

  ngOnDestroy(): void {
    this.detenerReintentos();
  }

  actualizarCodigo(valor: string): void {
    this.codigoInput.set(valor.toUpperCase());
  }

  /* ----------------------------------------------------------
     intentarUnirse()
     Primer intento manual (botón "Unirse")
  ---------------------------------------------------------- */
  intentarUnirse(): void {
    const codigo = this.codigoInput().trim();
    if (!codigo) return;

    this.errorMensaje.set('');
    this.intentoActual.set(0);
    this.estado.set('buscando');
    this.cdr.markForCheck();

    this.realizarIntento(codigo);
  }

  /* ----------------------------------------------------------
     realizarIntento()
     Un único intento de unión. Si falla con 404, decide si
     entra en modo espera (reintentos) o muestra error final.
  ---------------------------------------------------------- */
  private realizarIntento(codigo: string): void {
    this.debateService.unirseDebatePorCodigo(codigo).subscribe({
      next: (debate) => {
        this.detenerReintentos();
        this.estado.set('exito');
        this.cdr.markForCheck();

        if (debate?.id) {
          this.debateService.setDebateId(debate.id);
        }

        setTimeout(() => this.router.navigate(['/partida-debate']), 600);
      },
      error: (err) => {
        const es404 = err?.status === 404;

        if (es404) {
          this.entrarEnEsperaOFallar(codigo);
        } else {
          this.detenerReintentos();
          this.estado.set('error');
          this.errorMensaje.set(
            err?.error?.message ?? 'No se pudo conectar. Inténtalo de nuevo.'
          );
          this.cdr.markForCheck();
        }
      }
    });
  }

  /* ----------------------------------------------------------
     entrarEnEsperaOFallar()
     El código no existe todavía (probablemente el anfitrión
     sigue en el wizard). Empieza el ciclo de reintentos, o si
     ya se agotaron los intentos, muestra el error definitivo.
  ---------------------------------------------------------- */
  private entrarEnEsperaOFallar(codigo: string): void {
    if (this.intentoActual() >= MAX_INTENTOS) {
      this.detenerReintentos();
      this.estado.set('error');
      this.errorMensaje.set(
        'El anfitrión no ha iniciado el debate todavía. Inténtalo más tarde o pide un nuevo enlace.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.estado.set('esperando');
    this.cdr.markForCheck();

    if (this.intervaloReintento) return; /* ya en marcha */

    this.intervaloReintento = setInterval(() => {
      this.intentoActual.update(n => n + 1);
      this.cdr.markForCheck();

      if (this.intentoActual() >= MAX_INTENTOS) {
        this.detenerReintentos();
        this.estado.set('error');
        this.errorMensaje.set(
          'El anfitrión no ha iniciado el debate todavía. Inténtalo más tarde o pide un nuevo enlace.'
        );
        this.cdr.markForCheck();
        return;
      }

      this.realizarIntento(codigo);
    }, INTERVALO_REINTENTO_MS);
  }

  /* Cancelar la espera manualmente */
  cancelarEspera(): void {
    this.detenerReintentos();
    this.estado.set('inicial');
    this.intentoActual.set(0);
    this.cdr.markForCheck();
  }

  reintentarDesdeError(): void {
    this.estado.set('inicial');
    this.errorMensaje.set('');
    this.intentoActual.set(0);
    this.cdr.markForCheck();
  }

  private detenerReintentos(): void {
    if (this.intervaloReintento) {
      clearInterval(this.intervaloReintento);
      this.intervaloReintento = null;
    }
  }
}
