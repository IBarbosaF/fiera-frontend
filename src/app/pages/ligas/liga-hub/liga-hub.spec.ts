import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LigaHub } from './liga-hub';

describe('LigaHub', () => {
  let component: LigaHub;
  let fixture: ComponentFixture<LigaHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LigaHub],
    }).compileComponents();

    fixture = TestBed.createComponent(LigaHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
