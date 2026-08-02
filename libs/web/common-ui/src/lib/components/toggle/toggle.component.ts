import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'wm-toggle',
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleComponent {
  checked = input(false);
  disabled = input(false);
  ariaLabel = input<string | null>(null);

  checkedChange = output<boolean>();

  updateChecked(event: Event) {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement)) return;
    this.checkedChange.emit(checkbox.checked);
  }
}
