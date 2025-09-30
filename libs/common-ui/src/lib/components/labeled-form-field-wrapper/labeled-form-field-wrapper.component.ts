import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'wm-labeled-form-field-wrapper',
  imports: [],
  templateUrl: './labeled-form-field-wrapper.component.html',
  styleUrl: './labeled-form-field-wrapper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabeledFormFieldWrapperComponent {
  label = input.required<string>();
}
