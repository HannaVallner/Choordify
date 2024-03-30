import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompatibilityComponent } from './compatibility.component';

describe('CompatibilityComponent', () => {
  let component: CompatibilityComponent;
  let fixture: ComponentFixture<CompatibilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CompatibilityComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CompatibilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
