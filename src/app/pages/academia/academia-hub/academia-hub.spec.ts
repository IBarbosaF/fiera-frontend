import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcademiaHub } from './academia-hub';

describe('AcademiaHub', () => {
  let component: AcademiaHub;
  let fixture: ComponentFixture<AcademiaHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademiaHub],
    }).compileComponents();

    fixture = TestBed.createComponent(AcademiaHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
