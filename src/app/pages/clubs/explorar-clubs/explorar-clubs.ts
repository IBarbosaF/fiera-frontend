import { Component, signal, computed, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink }                                            from '@angular/router';
import { CommonModule }                                                  from '@angular/common';
import { FormsModule }                                                   from '@angular/forms';
import { ClubsService, Club } from '../../../core/services/clubs.service';

@Component({
  selector        : 'app-explorar-clubs',
  standalone      : true,
  imports         : [CommonModule, RouterLink, FormsModule],
  templateUrl     : './explorar-clubs.html',
  styleUrl        : './explorar-clubs.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ExplorarClubs {

  private router      = inject(Router);
  private clubsService = inject(ClubsService);
  private cdr = inject(ChangeDetectorRef);

  // ── Estado ────────────────────────────────────────────────────────────────
  clubs          = signal<Club[]>([]);
  cargando       = signal(false);
  error          = signal(false);
  busqueda       = signal<string>('');

  // ── Clubs filtrados ───────────────────────────────────────────────────────
  clubsFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    return this.clubs().filter(club =>
      !q
      || club.nombre.toLowerCase().includes(q)
      || club.siglas.toLowerCase().includes(q)
      || (club.institucion?.toLowerCase().includes(q) ?? false)
    );
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalClubs = computed(() => this.clubsFiltrados().length);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarClubs();
  }

  cargarClubs(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.clubsService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs.set(clubs);
        this.cargando.set(false);this.cdr.markForCheck();
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  iniciales(club: Club): string {
    if (club.siglas) return club.siglas.substring(0, 3);
    return club.nombre.split(' ')
      .filter(w => w.length > 2)
      .slice(0, 2)
      .map(w => w[0])
      .join('');
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  verClub(id: number): void {
    if (!id) return;
    this.router.navigate(['/clubs', id]);
  }

  irACrear(): void {
    this.router.navigate(['/clubs/crear']);
  }

  irAInicio(): void {
    this.router.navigate(['/']);
  }
}
