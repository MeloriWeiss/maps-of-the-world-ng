import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService, LoginData } from '@wm/web/data-access/auth';
import {
  FormInputComponent,
  LabeledFormFieldWrapperComponent,
} from '@wm/web/common-ui';
import { LabeledCheckboxComponent } from '@wm/web/common-ui';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom, tap } from 'rxjs';
import { validateEmail } from '../../validators';
import { authConfig } from '@wm/shared/auth';
import { authReturnUrl } from '../../auth/auth-return-url';

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
  readonly #route = inject(ActivatedRoute);
  #authService = inject(AuthService);

  authConfig = authConfig;

  loginForm = new FormGroup({
    email: new FormControl<string | null>('', {
      validators: [validateEmail],
    }),
    password: new FormControl<string | null>('', {
      validators: [Validators.required],
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

          this.#router
            .navigateByUrl(
              authReturnUrl(
                this.#route.snapshot.queryParamMap.get('returnUrl'),
              ),
            )
            .then();
        }),
      ),
    ).then();
  }
}
