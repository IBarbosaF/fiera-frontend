import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

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

export interface ContactoClub {
  email    : string | null;
  telefono : string | null;
  direccion: string | null;
  instagram: string | null;
  twitter  : string | null;
  web      : string | null;
}

export interface Club {
  id         : number;
  nombre     : string;
  siglas     : string;
  institucion: string;
  usuarios   : any[];
    // Campos opcionales — TODO: añadir al backend
  descripcion?: string | null;
  ciudad?     : string | null;
  fundacion?  : number | null;
  contacto?   : ContactoClub | null;
}

// ── Servicio ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ClubsService {

  private http = inject(HttpClient);

  getClubs() {
    return this.http.get<Club[]>(`${API_BASE}/api/app/clubs`).pipe(
      map(clubs => clubs.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    );
  }

  crearClub(club: Partial<Club>) {
    return this.http.post<Club>(`${API_BASE}/api/app/clubs/new`, club);
  }

  getClubById(id: number) {
    return this.http.get<Club>(`${API_BASE}/api/app/clubs/${id}`);
  }
}
