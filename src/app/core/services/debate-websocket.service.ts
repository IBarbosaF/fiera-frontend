import { Injectable, signal, OnDestroy } from '@angular/core';

/* ============================================================
   DebateWebsocketService — Conexión en tiempo real al debate

   ⚠️ ESQUELETO PENDIENTE DE CONFIGURAR ⚠️
   Este servicio está preparado pero NO conectado todavía.
   Antes de usarlo en producción, hay que:

   1. Instalar las librerías necesarias:
        npm install @stomp/stompjs sockjs-client
        npm install --save-dev @types/sockjs-client

   2. Confirmar con el backend (María Rosa) estos 4 datos y
      rellenar las constantes de la sección CONFIG más abajo:

      a) URL/endpoint de conexión WebSocket
         (ej. 'https://fiera.retorika.es/ws-debates' — SockJS
         usa http(s), no ws(s), porque hace un handshake HTTP
         inicial antes de upgradear la conexión)

      b) Topics/destinos exactos de suscripción para cada tipo
         de evento visto en el backend (DebateController /
         DebateService):
           - DEBATE_CREATED, DEBATE_STARTED, DEBATE_FINISHED
             → publishDebateEvent()
           - TURN_STARTED, TURN_PROCESSING, TURN_FINISHED,
             TURN_ERROR, INTERVENCION_PROCESADA
             → publishTurnEvent()
           - PARTICIPANT_JOINED, PARTICIPANT_LEFT,
             PARTICIPANTS_SYNC
             → publishParticipantsEvent()

      c) Estructura exacta del JSON de DebateSocketEvent tal
         como se serializa (los nombres de campo pueden no
         coincidir exactamente con el constructor Java visto:
         new DebateSocketEvent(tipo, debateId, payload))

      d) Si la conexión requiere autenticación (JWT en headers
         de CONNECT STOMP, o en query param del handshake)

   Hasta que estos datos estén confirmados, el frontend sigue
   funcionando con el flujo actual (procesarTurno → avanzarTurno
   → sondeo manual del estado del debate vía sus respuestas),
   que no depende de este servicio.
============================================================ */

/* ── CONFIG — rellenar con los datos reales del backend ── */
const WS_ENDPOINT = 'https://fiera.retorika.es/ws-debates'; // TODO: confirmar con backend

const TOPICS = {
  debate       : (debateId: number) => `/topic/debates/${debateId}`,              // TODO: confirmar
  turnos       : (debateId: number) => `/topic/debates/${debateId}/turnos`,        // TODO: confirmar
  participantes: (debateId: number) => `/topic/debates/${debateId}/participantes`, // TODO: confirmar
};

/* ── Tipos de evento vistos en el backend ── */
export type TipoEventoDebate =
  | 'DEBATE_CREATED' | 'DEBATE_STARTED' | 'DEBATE_FINISHED'
  | 'TURN_STARTED' | 'TURN_PROCESSING' | 'TURN_FINISHED' | 'TURN_ERROR'
  | 'INTERVENCION_PROCESADA'
  | 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT' | 'PARTICIPANTS_SYNC';

/* Estructura estimada del evento — AJUSTAR cuando se confirme
   el formato real de serialización del backend */
export interface DebateSocketEvent<T = any> {
  type    : TipoEventoDebate;
  debateId: number;
  payload : T;
}

@Injectable({
  providedIn: 'root'
})
export class DebateWebsocketService implements OnDestroy {

  /* Estado de conexión, útil para mostrar un indicador en la UI
     (ej. "Reconectando..." si se cae la conexión) */
  conectado = signal(false);

  /* Último evento recibido de cada tipo, expuesto como signals
     para que los componentes reaccionen sin suscribirse
     manualmente a Observables si no lo necesitan */
  ultimoEventoTurno        = signal<DebateSocketEvent | null>(null);
  ultimoEventoDebate       = signal<DebateSocketEvent | null>(null);
  ultimoEventoParticipante = signal<DebateSocketEvent | null>(null);

  private client: any = null; // TODO: tipar como Client de @stomp/stompjs
  private debateIdActual: number | null = null;

  /* ----------------------------------------------------------
     conectar(debateId)
     Abre la conexión y se suscribe a los 3 topics del debate.

     Implementación pendiente — placeholder de la forma en que
     se haría con @stomp/stompjs una vez instalado:

     import { Client } from '@stomp/stompjs';
     import SockJS from 'sockjs-client';

     this.client = new Client({
       webSocketFactory: () => new SockJS(WS_ENDPOINT),
       connectHeaders: {
         Authorization: `Bearer ${token}` // si hace falta auth
       },
       onConnect: () => {
         this.conectado.set(true);
         this.client.subscribe(TOPICS.debate(debateId), (msg) => {
           this.ultimoEventoDebate.set(JSON.parse(msg.body));
         });
         this.client.subscribe(TOPICS.turnos(debateId), (msg) => {
           this.ultimoEventoTurno.set(JSON.parse(msg.body));
         });
         this.client.subscribe(TOPICS.participantes(debateId), (msg) => {
           this.ultimoEventoParticipante.set(JSON.parse(msg.body));
         });
       },
       onDisconnect: () => this.conectado.set(false),
       onStompError: (frame) => console.error('WS error:', frame),
       reconnectDelay: 3000,
     });

     this.client.activate();
  ---------------------------------------------------------- */
  conectar(debateId: number): void {
    this.debateIdActual = debateId;
    console.warn(
      '[DebateWebsocketService] conectar() no implementado todavía. ' +
      'Ver comentarios del archivo para los pasos pendientes.'
    );
    /* TODO: implementar cuando se confirmen los datos del backend */
  }

  /* ----------------------------------------------------------
     desconectar()
     Cierra la conexión — llamar en ngOnDestroy() del
     componente partida-debate.
  ---------------------------------------------------------- */
  desconectar(): void {
    if (this.client) {
      this.client.deactivate?.();
      this.client = null;
    }
    this.conectado.set(false);
    this.debateIdActual = null;
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
