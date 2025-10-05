import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'wm-labeled-checkbox',
  imports: [],
  templateUrl: './labeled-checkbox.component.html',
  styleUrl: './labeled-checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabeledCheckboxComponent {
  label = input.required<string>()
}
