import { Component, signal, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink }                                              from '@angular/router';
import { CommonModule }                                                                    from '@angular/common';
import { ClubsService, Club }                                                              from '../../../core/services/clubs.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector        : 'app-club-publico',
  standalone      : true,
  imports         : [CommonModule, RouterLink],
  templateUrl     : './club-publico.html',
  styleUrl        : './club-publico.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClubPublico implements OnInit {

  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private clubsService = inject(ClubsService);
  private cdr          = inject(ChangeDetectorRef);

  // ── Estado ────────────────────────────────────────────────────────────────
  club      = signal<Club | null>(null);
  cargando  = signal(true);
  error     = signal(false);
  tabActivo = signal<'info' | 'miembros' | 'contacto'>('info');
  solicitado = signal(false); // TODO: POST /api/app/clubs/unirse cuando esté disponible

  // ── OnInit ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.clubsService.getClubById(id).subscribe({
      next: (club) => {
        this.club.set(club);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  iniciales(nombre: string): string {
    return nombre.split(' ')
      .filter(w => w.length > 2)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  inicialesClub(club: Club): string {
    if (club.siglas) return club.siglas.substring(0, 3).toUpperCase();
    return this.iniciales(club.nombre);
  }

  ubicacion(club: Club): string {
    const partes = [club.ciudad, club.provincia, club.pais].filter(Boolean);
    return partes.length ? partes.join(', ') : '—';
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  solicitarUnirse(): void {
    // TODO: POST /api/app/clubs/update/{id} añadir usuario
    this.solicitado.set(true);
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  volver(): void {
    this.router.navigate(['/clubs/explorar']);
  }

  private auth = inject(AuthService);

  yaSoyMiembro = computed(() => {
    const c = this.club();
    const userId = this.auth.usuario()?.id;
    if (!c || !userId) return false;
    return c.usuarios?.some((u: any) => u.id === userId) ?? false;
  });
}
