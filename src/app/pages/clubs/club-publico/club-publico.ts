// src/app/pages/clubs/club-publico/club-publico.ts

import { Component, signal, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink }                                              from '@angular/router';
import { CommonModule }                                                                    from '@angular/common';
import { ClubsService, Club }                                                              from '../../../core/services/clubs.service';

// ── Mock de info extra por club (TODO: vendrá del backend) ─────────────────
const CONTACTO_MOCK: Record<string, {
  descripcion: string;
  ciudad     : string;
  fundacion  : number;
  email      : string | null;
  telefono   : string | null;
  direccion  : string | null;
  instagram  : string | null;
  twitter    : string | null;
  web        : string | null;
}> = {
  1: {
    descripcion: 'Formamos estudiantes apasionados por el debate y la oratoria. Competimos en ligas nacionales e internacionales.',
    ciudad     : 'Madrid',
    fundacion  : 2019,
    email      : 'debate@ceu.es',
    telefono   : '+34 91 514 04 00',
    direccion  : 'C/ Julián Romea 23, Madrid',
    instagram  : '@debateceu',
    twitter    : '@debateceu',
    web        : 'www.ceu.es/debate',
  },
};

const CONTACTO_DEFAULT = {
  descripcion: 'Club de debate registrado en FIERA.',
  ciudad     : null,
  fundacion  : null,
  email      : null,
  telefono   : null,
  direccion  : null,
  instagram  : null,
  twitter    : null,
  web        : null,
};

@Component({
  selector        : 'app-club-publico',
  standalone      : true,
  imports         : [CommonModule, RouterLink],
  templateUrl     : './club-publico.html',
  styleUrl        : './club-publico.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClubPublico implements OnInit {

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private clubsService = inject(ClubsService);
  private cdr    = inject(ChangeDetectorRef);

  // ── Estado ────────────────────────────────────────────────────────────────
  club     = signal<Club | null>(null);
  cargando = signal(true);
  error    = signal(false);
  tabActivo = signal<'info' | 'miembros' | 'contacto'>('info');
  solicitado = signal(false); // TODO: conectar con backend

  // ── OnInit ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const nombreUrl = this.route.snapshot.paramMap.get('id');

    if (nombreUrl) {
      this.clubsService.getClubs().subscribe({
        next: (listaClubs) => {
          const clubEncontrado = listaClubs.find(c => c.nombre === nombreUrl);

          if (clubEncontrado) {
            this.club.set(clubEncontrado);
          } else {
            this.error.set(true);
          }
          this.cargando.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error.set(true);
          this.cargando.set(false);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.cargando.set(false);
      this.error.set(true);
    }
  }

  // ── Contacto mock ─────────────────────────────────────────────────────────
  contacto(nombre: string) {
    return CONTACTO_MOCK[nombre] ?? CONTACTO_DEFAULT;
  }

  // ── Iniciales ─────────────────────────────────────────────────────────────
  iniciales(nombre: string): string {
    return nombre.split(' ')
      .filter(w => w.length > 2)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  inicialesClub(club: Club): string {
    if (club.siglas) return club.siglas.substring(0, 3);
    return this.iniciales(club.nombre);
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  solicitarUnirse(): void {
    // TODO: POST /api/clubs/:id/solicitar
    this.solicitado.set(true);
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  volver(): void {
    this.router.navigate(['/clubs/explorar']);
  }
}
