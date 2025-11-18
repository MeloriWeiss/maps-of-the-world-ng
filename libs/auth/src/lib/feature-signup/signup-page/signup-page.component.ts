import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FormInputComponent,
  LabeledFormFieldWrapperComponent,
} from '@wm/common-ui';
import { LabeledCheckboxComponent } from '@wm/common-ui';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'wm-signup-page',
  imports: [
    FormInputComponent,
    LabeledCheckboxComponent,
    LabeledFormFieldWrapperComponent,
    RouterLink,
  ],
  templateUrl: './signup-page.component.html',
  styleUrl: './signup-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPageComponent {}
