import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClashInfo } from './clash-info';

describe('ClashInfo', () => {
  let component: ClashInfo;
  let fixture: ComponentFixture<ClashInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClashInfo],
    }).compileComponents();

    fixture = TestBed.createComponent(ClashInfo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
