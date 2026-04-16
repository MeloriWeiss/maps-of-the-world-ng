import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService, LoginData } from '@wm/web/data-access/auth';
import {
  FormInputComponent,
  LabeledFormFieldWrapperComponent,
} from '@wm/web/common-ui';
import { LabeledCheckboxComponent } from '@wm/web/common-ui';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom, tap } from 'rxjs';
import { validateEmail, validatePassword } from '../../validators';
import { authConfig } from '@wm/shared/auth';

@Component({
  selector: 'wm-login-page',
  imports: [
    FormInputComponent,
    LabeledFormFieldWrapperComponent,
    LabeledCheckboxComponent,
    RouterLink,
    ReactiveFormsModule,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  #router = inject(Router);
  #authService = inject(AuthService);

  authConfig = authConfig;

  loginForm = new FormGroup({
    email: new FormControl<string | null>('', {
      validators: [validateEmail],
    }),
    password: new FormControl<string | null>('', {
      validators: [validatePassword],
    }),
  });

  login() {
    this.loginForm.markAsTouched();
    this.loginForm.updateValueAndValidity();

    if (!this.loginForm.valid) return;

    const formValue = this.loginForm.value;

    const data: LoginData = {
      email: formValue.email ?? '',
      password: formValue.password ?? '',
    };

    firstValueFrom(
      this.#authService.login(data).pipe(
        tap((res) => {
          if (!res) return;

          this.#router.navigate(['/']).then();
        }),
      ),
    ).then();
  }
}
