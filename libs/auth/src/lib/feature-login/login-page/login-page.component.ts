import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {AuthService} from '@wm/data-access/auth';
import { FormInputComponent, LabeledFormFieldWrapperComponent } from '@wm/common-ui';

@Component({
  selector: 'wm-login-page',
  imports: [
    FormInputComponent,
    LabeledFormFieldWrapperComponent,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  as = inject(AuthService)
}
