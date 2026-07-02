import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreguntonInfo } from './pregunton-info';

describe('PreguntonInfo', () => {
  let component: PreguntonInfo;
  let fixture: ComponentFixture<PreguntonInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreguntonInfo],
    }).compileComponents();

    fixture = TestBed.createComponent(PreguntonInfo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
