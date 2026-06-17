import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API_BASE = 'https://fiera.retorika.es';

// ── Tipos ──────────────────────────────────────────────────────────────────
export type RolMiembro = 'administrador' | 'miembro' | 'pendiente';

export interface Miembro {
  id       : number;
  nombre   : string;
  rol      : RolMiembro;
  principal: boolean;
  avatar   : string | null;
}

export interface Club {
  id         : number;
  nombre     : string;
  siglas     : string;
  institucion: string;
  usuarios   : any[];
}

// ── Servicio ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ClubsService {

  private http = inject(HttpClient);

  getClubs() {
    return this.http.get<Club[]>(`${API_BASE}/api/app/clubs`);
  }

  crearClub(club: Partial<Club>) {
    return this.http.post<Club>(`${API_BASE}/api/app/clubs/new`, club);
  }
}
