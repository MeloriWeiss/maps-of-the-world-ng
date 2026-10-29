import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Предоставляет флажок с подписью для форм приложения. */
@Component({
  selector: 'wm-labeled-checkbox',
  imports: [],
  templateUrl: './labeled-checkbox.component.html',
  styleUrl: './labeled-checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabeledCheckboxComponent {
  label = input.required<string>();
}
