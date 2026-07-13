import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExporarLigas } from './exporar-ligas';

describe('ExporarLigas', () => {
  let component: ExporarLigas;
  let fixture: ComponentFixture<ExporarLigas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExporarLigas],
    }).compileComponents();

    fixture = TestBed.createComponent(ExporarLigas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
