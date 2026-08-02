import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToggleComponent } from './toggle.component';

describe('ToggleComponent', () => {
  let fixture: ComponentFixture<ToggleComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ToggleComponent);
    fixture.detectChanges();
  });

  it('emits the checked state when toggled', () => {
    const checkedChange = jest.fn();
    fixture.componentInstance.checkedChange.subscribe(checkedChange);
    const checkbox = fixture.nativeElement.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );

    expect(checkbox).not.toBeNull();
    if (!checkbox) return;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(checkedChange).toHaveBeenCalledWith(true);
  });
});
