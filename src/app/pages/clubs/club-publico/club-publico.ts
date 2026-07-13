import { Component, signal, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink }                                                        from '@angular/router';
import { CommonModule }                                                                              from '@angular/common';
import { ClubsService, Club }                                                                        from '../../../core/services/clubs.service';
import { AuthService }                                                                                from '../../../core/services/auth.service';

type TabClub = 'info' | 'miembros' | 'administradores' | 'torneos' | 'contacto';

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
  private auth         = inject(AuthService);
  private cdr          = inject(ChangeDetectorRef);

  // ── Estado ────────────────────────────────────────────────────────────────
  club       = signal<Club | null>(null);
  cargando   = signal(true);
  error      = signal(false);
  tabActivo  = signal<TabClub>('info');
  solicitado = signal(false); // TODO: POST solicitud de unión cuando el backend lo soporte

  yaSoyMiembro = computed(() => {
    const c = this.club();
    const userId = this.auth.usuario()?.id;
    if (!c || !userId) return false;
    return c.usuarios?.some((u: any) => u.id === userId) ?? false;
  });

  // ── Computed: datos de torneos (agregados defensivamente) ────────────────
  torneosStats = computed(() => {
    const torneos = this.club()?.torneos ?? [];
    return {
      total      : torneos.length,
      ganados    : torneos.filter((t: any) => t.resultado === 'ganado').length,
      perdidos   : torneos.filter((t: any) => t.resultado === 'perdido').length,
      empatados  : torneos.filter((t: any) => t.resultado === 'empate').length,
      participados: torneos.length,
    };
  });

  // ── OnInit ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.cargarClub(id);
    });
  }

  private cargarClub(id: number): void {
    this.cargando.set(true);
    this.error.set(false);
    this.club.set(null);
    this.tabActivo.set('info');

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
    return (nombre ?? 'Usuario').split(' ')
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
    const partes = [club.ciudad, club.provincia, club.comunidad, club.pais].filter(Boolean);
    return partes.length ? partes.join(', ') : '—';
  }

  nombreCreador(club: Club): string {
    const creador = club.creadoPor as any;
    if (!creador) return 'No especificado';
    return creador.nombre ?? creador.username ?? creador.email ?? 'No especificado';
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  solicitarUnirse(): void {
    // TODO: POST /api/app/clubs/solicitar cuando el backend lo soporte
    this.solicitado.set(true);
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  volver(): void {
    this.router.navigate(['/clubs/explorar']);
  }
}
