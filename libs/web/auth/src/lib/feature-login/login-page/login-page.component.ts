import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@wm/data-access/auth';
import {
  FormInputComponent,
  LabeledFormFieldWrapperComponent,
} from '@wm/common-ui';
import { LabeledCheckboxComponent } from '@wm/common-ui';
import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom, tap } from 'rxjs';

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

  loginForm = new FormGroup({
    email: new FormControl<string | null>('', {
      validators: Validators.required,
    }),
    password: new FormControl<string | null>('', {
      validators: Validators.required,
    }),
  });

  login() {
    firstValueFrom(
      this.#authService.login().pipe(
        tap((res) => {
          if (!res.logged) return;
          this.#router.navigate(['/']).then();
        }),
      ),
    ).then();
  }
}
