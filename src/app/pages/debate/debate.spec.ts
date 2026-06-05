import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Debate } from './debate';

describe('Debate', () => {
  let component: Debate;
  let fixture: ComponentFixture<Debate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Debate],
    }).compileComponents();

    fixture = TestBed.createComponent(Debate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
