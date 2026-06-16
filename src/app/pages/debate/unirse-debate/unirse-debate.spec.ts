import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnirseDebate } from './unirse-debate';

describe('UnirseDebate', () => {
  let component: UnirseDebate;
  let fixture: ComponentFixture<UnirseDebate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnirseDebate],
    }).compileComponents();

    fixture = TestBed.createComponent(UnirseDebate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
