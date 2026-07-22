import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, of } from 'rxjs';
import { AuthService } from './auth.service';
import { RetosService } from './retos.service';
import { TemaApi, IntervencionApi } from './debate.service';

const API_BASE = 'https://fiera.retorika.es';

/* ============================================================
   ClashService — Reto: encontrar el clash más importante

   MODO FÁCIL únicamente (según confirmación de backend). El modo
   difícil se muestra como "Próximamente" en el componente, sin
   lógica de servicio todavía.

   Un solo clash generado por IA, compartido por TODOS los
   usuarios cada 24h — mismo patrón que Preguntón y el tema del
   Careo. Antes de crear uno nuevo, se comprueba si ya existe el
   de hoy vía GET y se reutiliza.

   ASUNCIONES sin confirmar con backend (María Rosa no disponible):
   - El body de POST /new-clash tiene la misma forma que
     DebateRequest (crearDebate), con un campo `clash` anidado.
   - Las 8 intervenciones se envían como "huecos" (mensaje vacío,
     postura fijada) y la IA rellena mensaje + calcula mejorClashId
     de una sola vez, igual que ya hace con procesarTurno() en
     un debate normal.
   - PUT /update/{id} acepta { mejorClashUsuario: [id, id] } y
     devuelve el objeto Clash con `feedback` ya relleno.
   Verificar todo esto en Network al probar por primera vez.
============================================================ */

export interface ClashIntervencionApi extends IntervencionApi {}

export interface ClashDebateApi {
  id            : number;
  modo?         : string;
  dificultad?   : string;
  status?       : string;
  temaElegido?  : string;
  creadoA?      : string;
  intervenciones: ClashIntervencionApi[];
  tema?         : TemaApi;
}

export interface ClashApi {
  id                    : number;
  respuestaClashUsuario?: string | null;
  feedback?             : string | null;
  debate                : ClashDebateApi;
  mejorClashId          : number[];       // los 2 ids correctos, según FIERA
  mejorClashUsuario?    : number[] | null; // los 2 ids que eligió el usuario
}

@Injectable({ providedIn: 'root' })
export class ClashService {

  private http  = inject(HttpClient);
  private auth  = inject(AuthService);
  private retos = inject(RetosService);

  /* ----------------------------------------------------------
     obtenerClashDeHoy()
     Trae todos los clashes y filtra el que se creó hoy
     (comparando la fecha de debate.creadoA). Si hay varios
     de hoy (por condición de carrera entre usuarios), coge
     el primero — todos deberían compartir el mismo tema.
  ---------------------------------------------------------- */
  obtenerClashDeHoy() {
    const hoy = this.retos.fechaHoy();
    return this.http.get<ClashApi[]>(`${API_BASE}/api/app/clashes`).pipe(
      map(lista => lista.find(c => c.debate?.creadoA?.startsWith(hoy)) ?? null)
    );
  }

  /* ----------------------------------------------------------
     obtenerOCrearClashDeHoy()
     Si ya existe el de hoy, lo reutiliza. Si no, crea uno nuevo
     con un tema elegido por el mismo hash de fecha que el resto
     de retos, para que sea reproducible aunque cambie el banco.
  ---------------------------------------------------------- */
  obtenerOCrearClashDeHoy(temas: TemaApi[]) {
    return this.obtenerClashDeHoy().pipe(
      switchMap(existente => {
        if (existente) return of(existente);

        const tema = this.retos.elegirDelDia(temas);
        if (!tema) throw new Error('No hay temas disponibles para generar el Clash');

        return this.crearClash(tema);
      })
    );
  }

  /* ----------------------------------------------------------
     crearClash()
     POST /new-clash — genera un clash nuevo vía IA a partir de
     un tema. Las 8 intervenciones van con mensaje vacío; se
     espera que el backend/IA las rellene y calcule mejorClashId.
  ---------------------------------------------------------- */
  private crearClash(tema: TemaApi) {
    const usuarioId = this.auth.usuario()?.id ?? 4;

    const intervenciones = [
      ...Array(4).fill(null).map((_, i) => ({
        nombre          : `favor-${i + 1}`,
        usuario         : null,
        duracion        : '00:01:00',
        speaker         : 'fiera',
        postura         : 'pro',
        mensaje         : '',
        estado          : 'PENDING',
        speakerInputType: 'text',
      })),
      ...Array(4).fill(null).map((_, i) => ({
        nombre          : `contra-${i + 1}`,
        usuario         : null,
        duracion        : '00:01:00',
        speaker         : 'fiera',
        postura         : 'contra',
        mensaje         : '',
        estado          : 'PENDING',
        speakerInputType: 'text',
      })),
    ];

    const body = {
      modo        : 'clash',
      dificultad  : 'medio',
      status      : 'CREATED',
      creadoA     : new Date().toISOString(),
      temaElegido : tema.enunciado,
      usuarios    : [{ id: usuarioId }],
      tema        : tema.id ? { id: tema.id } : null,
      fiera       : { id: 1 },
      intervenciones,
      resultado   : null,
      clash: {
        mejorClashId         : [],
        mejorClashUsuario     : [],
        respuestaClashUsuario : '',
        feedback              : '',
      },
    };

    return this.http.post<ClashApi>(`${API_BASE}/api/app/clashes/new-clash`, body);
  }

  /* ----------------------------------------------------------
     responderClash()
     PUT /update/{id} — envía la elección del usuario (modo
     fácil: 1 intervención de favor + 1 de contra) y recibe el
     feedback de FIERA explicando el clash correcto.
  ---------------------------------------------------------- */
  responderClash(clashId: number, favorIntervencionId: number, contraIntervencionId: number) {
    const body = {
      mejorClashUsuario: [favorIntervencionId, contraIntervencionId],
    };

    return this.http.put<ClashApi>(`${API_BASE}/api/app/clashes/update/${clashId}`, body);
  }
}
