import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink }                 from '@angular/router';
import { CommonModule }                       from '@angular/common';

@Component({
  selector        : 'app-clubs-hub',
  standalone      : true,
  imports         : [CommonModule, RouterLink],
  templateUrl     : './clubs-hub.html',
  styleUrl        : './clubs-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class ClubsHub {
  constructor(private router: Router) {}

  irACrear()    : void { this.router.navigate(['/clubs/crear']);    }
  irAExplorar() : void { this.router.navigate(['/clubs/explorar']); }
  irAMiClub()   : void { this.router.navigate(['/clubs/1']);        } // TODO: id del club del usuario
}
