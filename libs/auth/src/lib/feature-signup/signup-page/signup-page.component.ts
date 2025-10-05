import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AuthSubmitButtonComponent
} from '../../../../../common-ui/src/lib/components/auth-submit-button/auth-submit-button.component';
import { FormInputComponent, LabeledFormFieldWrapperComponent } from '@wm/common-ui';
import {
  LabeledCheckboxComponent
} from '../../../../../common-ui/src/lib/components/labeled-checbox/labeled-checkbox.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'wm-signup-page',
  imports: [
    AuthSubmitButtonComponent,
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
