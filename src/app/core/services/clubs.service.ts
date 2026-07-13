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
  id                  : number;
  nombre              : string;
  siglas              : string;
  institucion         : string;
  imgUrl?             : string | null;
  pais?               : string | null;
  comunidad?          : string | null;
  provincia?          : string | null;
  ciudad?             : string | null;
  direccion?          : string | null;
  fundacion?          : number | null;
  tamano?             : number | null;
  status?             : string | null;
  frecuenciaFormacion?: string | null;
  usuarios            : any[];
  admins?             : any[];
  creadoPor?          : any | null;
  torneos?            : any[];
}

// ── Servicio ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ClubsService {

  private http = inject(HttpClient);

  getClubs() {
    return this.http.get<any[]>(`${API_BASE}/api/app/clubs`).pipe(
      map(clubs => clubs
        .map(c => ({ ...c, tamano: c['tamaño'] }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      )
    );
  }

  crearClub(club: Partial<Club>) {
    return this.http.post<Club>(`${API_BASE}/api/app/clubs/new`, club);
  }

  getClubById(id: number) {
    return this.http.get<any>(`${API_BASE}/api/app/clubs/buscar/${id}`).pipe(
      map(c => ({ ...c, tamano: c['tamaño'] }))
    );
  }
}
