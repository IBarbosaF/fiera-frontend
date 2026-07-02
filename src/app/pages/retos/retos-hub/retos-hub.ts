import { Component, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CareoInfo } from '../retos-careo/careo-info/careo-info';

const STORAGE_SKIP_INFO = 'careo_skip_info';

@Component({
  selector        : 'app-retos-hub',
  standalone      : true,
  imports         : [CommonModule, CareoInfo],
  templateUrl     : './retos-hub.html',
  styleUrl        : './retos-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class RetosHub {

  @ViewChild(CareoInfo) careoInfoModal!: CareoInfo;

  constructor(private router: Router) {}

  irACareo(): void {
    // Mismo Careo que en Home: si el usuario marcó "no mostrar más"
    // vamos directos a /careo-diario, si no, abrimos el modal informativo.
    if (localStorage.getItem(STORAGE_SKIP_INFO) === 'true') {
      this.router.navigate(['/careo-diario']);
    } else {
      this.careoInfoModal.abrir();
    }
  }

  irAClash(): void {
    // TODO: reemplazar cuando exista el componente real de Clashes
    this.router.navigate(['/retos/clash']);
  }

  irAPregunton(): void {
    // TODO: reemplazar cuando exista el componente real de Preguntón
    this.router.navigate(['/retos/pregunton']);
  }
}
