import { Component, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CareoInfo } from '../retos-careo/careo-info/careo-info';
import { ClashInfo } from "../retos-clash/clash-info/clash-info";
import { PreguntonInfo } from '../retos-pregunton/pregunton-info/pregunton-info';

const STORAGE_SKIP_INFO = 'careo_skip_info';

@Component({
  selector        : 'app-retos-hub',
  standalone      : true,
  imports         :[CommonModule, CareoInfo, ClashInfo, PreguntonInfo],
  templateUrl     : './retos-hub.html',
  styleUrl        : './retos-hub.css',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class RetosHub {

  @ViewChild(CareoInfo) careoInfoModal!: CareoInfo;
  @ViewChild(ClashInfo) clashInfoModal!: ClashInfo;
  @ViewChild(PreguntonInfo) preguntonInfoModal!: PreguntonInfo;


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
    if (localStorage.getItem(STORAGE_SKIP_INFO) === 'true') {
      this.router.navigate(['/clash-diario']);
    } else {
      this.clashInfoModal.abrir();
    }
  }

  irAPregunton(): void {
    if (localStorage.getItem(STORAGE_SKIP_INFO) === 'true') {
      this.router.navigate(['/pregunton-diario']);
    } else {
      this.preguntonInfoModal.abrir();
    }
  }
}
