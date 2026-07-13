import { Component, signal, computed, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, RouterLink }                                                        from '@angular/router';
import { CommonModule }                                                                              from '@angular/common';
import { ClubsService, Club }                                                                        from '../../../core/services/clubs.service';
import { AuthService }                                                                                from '../../../core/services/auth.service';

export type TabActivo = 'informacion' | 'miembros' | 'administradores' | 'torneos' | 'contacto';

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
  private auth         = inject(AuthService);
  private cdr          = inject(ChangeDetectorRef);

  // ── Estado ────────────────────────────────────────────────────────────────
  club      = signal<Club | null>(null);
  cargando  = signal(true);
  error     = signal(false);
  tabActivo = signal<TabActivo>('informacion');

  // ── Computed: ¿el usuario logueado es admin de este club? ─────────────────
  esAdmin = computed(() => {
    const c = this.club();
    const userId = this.auth.usuario()?.id;
    if (!c || !userId) return false;
    return c.admins?.some((a: any) => a.id === userId) ?? false;
  });

  // ── Computed: stats de torneos (defensivo ante datos vacíos) ──────────────
  torneosStats = computed(() => {
    const torneos = this.club()?.torneos ?? [];
    return {
      total       : torneos.length,
      ganados     : torneos.filter((t: any) => t.resultado === 'ganado').length,
      perdidos    : torneos.filter((t: any) => t.resultado === 'perdido').length,
      empatados   : torneos.filter((t: any) => t.resultado === 'empate').length,
      participados: torneos.length,
    };
  });

  // ── OnInit: cargar club por ID (reactivo a cambios de parámetro) ──────────
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.cargarClub(id);
    });
  }

  cargarClub(id: number): void {
    this.cargando.set(true);
    this.error.set(false);
    this.club.set(null);
    this.tabActivo.set('informacion');

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

  // ── Acciones de gestión (TODO: conectar con backend cuando existan endpoints) ──
  hacerAdmin(usuario: any): void {
    // TODO: PUT /api/app/clubs/update/{id} añadiendo a admins
    console.log('TODO hacerAdmin', usuario);
  }

  revocarAdmin(admin: any): void {
    // TODO: PUT /api/app/clubs/update/{id} quitando de admins
    console.log('TODO revocarAdmin', admin);
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  volver(): void {
    this.router.navigate(['/clubs']);
  }

  irAEditar(): void {
    // TODO: navegar a edición del club cuando exista el flujo
    console.log('Editar club:', this.club()?.id);
  }
}
