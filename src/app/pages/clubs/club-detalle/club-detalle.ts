import { Component, signal, computed, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute, RouterLink }                                    from '@angular/router';
import { CommonModule }                                                          from '@angular/common';
import { ClubsService, Club } from '../../../core/services/clubs.service';

export type TabActivo = 'informacion' | 'miembros';

@Component({
  selector        : 'app-club-detalle',
  standalone      : true,
  imports         : [CommonModule, RouterLink],
  templateUrl     : './club-detalle.html',
  styleUrl        : './club-detalle.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClubDetalle implements OnInit {

  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private clubsService = inject(ClubsService);

  // ── Estado ────────────────────────────────────────────────────────────────
  club      = signal<Club | null>(null);
  cargando  = signal(false);
  error     = signal(false);
  tabActivo = signal<TabActivo>('informacion');

  // ── OnInit: cargar club por ID ────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarClub(id);
  }

  cargarClub(id: number): void {
    this.cargando.set(true);
    this.error.set(false);

    this.clubsService.getClubs().subscribe({
      next: (clubs) => {
        const encontrado = clubs.find(c => c.id === id) ?? null;
        this.club.set(encontrado);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  iniciales(nombre: string): string {
    return nombre.split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  volver(): void {
    this.router.navigate(['/clubs']);
  }
}
