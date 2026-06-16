import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebateRapido } from './debate-rapido';

describe('DebateRapido', () => {
  let component: DebateRapido;
  let fixture: ComponentFixture<DebateRapido>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebateRapido],
    }).compileComponents();

    fixture = TestBed.createComponent(DebateRapido);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
