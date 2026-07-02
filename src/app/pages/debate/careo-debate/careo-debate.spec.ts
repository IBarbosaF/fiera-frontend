import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareoDebate } from './careo-debate';

describe('CareoDebate', () => {
  let component: CareoDebate;
  let fixture: ComponentFixture<CareoDebate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareoDebate],
    }).compileComponents();

    fixture = TestBed.createComponent(CareoDebate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
