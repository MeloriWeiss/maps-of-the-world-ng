import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ProfileService } from '@wm/web/data-access/profile';
import { SuccessToastComponent, ToastService } from '@wm/web/common-ui';

@Component({
  selector: 'wm-profile-page-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-page-edit.component.html',
  styleUrl: './profile-page-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageEditComponent {
  #profileService = inject(ProfileService);
  #toastService = inject(ToastService);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly form = new FormGroup({
    nickname: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(128),
      ],
    }),
    firstName: new FormControl('', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.#profileService
      .getMyAccount()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (account) => {
          this.form.patchValue({
            nickname: account.nickname,
            firstName: account.firstName ?? '',
            bio: account.bio ?? '',
          });
        },
        error: () => this.statusMessage.set('Не удалось загрузить профиль.'),
      });
  }

  save() {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.isSaving.set(true);
    this.statusMessage.set(null);
    this.#profileService
      .updateMyAccount({
        nickname: value.nickname.trim(),
        firstName: value.firstName.trim() || null,
        bio: value.bio.trim() || null,
      })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#toastService.show(SuccessToastComponent, {
            message: 'Изменения профиля сохранены',
          });
          void this.#router.navigate(['../maps'], {
            relativeTo: this.#route,
          });
        },
        error: () => this.statusMessage.set('Не удалось сохранить профиль.'),
      });
  }
}
