import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClashDiario } from './clash-diario';

describe('ClashDiario', () => {
  let component: ClashDiario;
  let fixture: ComponentFixture<ClashDiario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClashDiario],
    }).compileComponents();

    fixture = TestBed.createComponent(ClashDiario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
