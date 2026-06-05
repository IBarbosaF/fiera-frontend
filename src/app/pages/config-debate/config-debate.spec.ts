import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigDebate } from './config-debate';

describe('ConfigDebate', () => {
  let component: ConfigDebate;
  let fixture: ComponentFixture<ConfigDebate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigDebate],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigDebate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
