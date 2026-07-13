import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router, RouterLink }                                    from '@angular/router';
import { CommonModule }                                          from '@angular/common';
import { AuthService }                                           from '../../../core/services/auth.service';

@Component({
  selector        : 'app-clubs-hub',
  standalone      : true,
  imports         : [CommonModule, RouterLink],
  templateUrl     : './clubs-hub.html',
  styleUrl        : './clubs-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClubsHub {

  private router = inject(Router);
  private auth   = inject(AuthService);

  // Id del primer club del usuario logueado
  miClubId = computed(() => {
    const clubs = this.auth.usuario()?.clubs;
    return clubs && clubs.length > 0 ? clubs[0].id : null;
  });

  irACrear()    : void { this.router.navigate(['/clubs/crear']);    }
  irAExplorar() : void { this.router.navigate(['/clubs/explorar']); }

  irAMiClub(): void {
    const id = this.miClubId();
    if (id) {
      this.router.navigate(['/clubs', id]);
    } else {
      // Si no tiene club, llevarle a explorar
      this.router.navigate(['/clubs/explorar']);
    }
  }
}
