import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormInputComponent,
  LabeledFormFieldWrapperComponent,
} from '@wm/web/common-ui';
import { LabeledCheckboxComponent } from '@wm/web/common-ui';
import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService, RegisterData } from '@wm/web/data-access/auth';
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '../../validators';
import { authConfig } from '@wm/shared/auth';
import { firstValueFrom, tap } from 'rxjs';

@Component({
  selector: 'wm-signup-page',
  imports: [
    FormInputComponent,
    LabeledCheckboxComponent,
    LabeledFormFieldWrapperComponent,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  #router = inject(Router);
  #authService = inject(AuthService);

  authConfig = authConfig;

  registerForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [validateUsername],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [validateEmail],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [validatePassword],
    }),
  });

  register() {
    this.registerForm.markAsTouched();
    this.registerForm.updateValueAndValidity();

    if (!this.registerForm.valid) return;

    const formValue = this.registerForm.value;

    const data: RegisterData = {
      username: formValue.username ?? '',
      email: formValue.email ?? '',
      password: formValue.password ?? '',
    };

    firstValueFrom(
      this.#authService.register(data).pipe(
        tap((res) => {
          if (!res) return;

          this.#router.navigate(['/']).then();
        }),
      ),
    ).then();
  }
}
