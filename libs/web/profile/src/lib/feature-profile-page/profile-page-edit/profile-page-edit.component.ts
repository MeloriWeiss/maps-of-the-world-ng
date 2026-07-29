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
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, of } from 'rxjs';
import { ProfileService } from '@wm/web/data-access/profile';

@Component({
  selector: 'wm-profile-page-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-page-edit.component.html',
  styleUrl: './profile-page-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageEditComponent {
  #profileService = inject(ProfileService);
  #destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly avatarFile = signal<File | null>(null);
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
    const avatar = this.avatarFile();
    forkJoin({
      account: this.#profileService.updateMyAccount({
        nickname: value.nickname.trim(),
        firstName: value.firstName.trim() || null,
        bio: value.bio.trim() || null,
      }),
      avatar: avatar ? this.#profileService.uploadAvatar(avatar) : of(null),
    })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.avatarFile.set(null);
          this.statusMessage.set('Изменения сохранены.');
        },
        error: () => this.statusMessage.set('Не удалось сохранить профиль.'),
      });
  }

  selectAvatar(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 5_000_000) {
      this.statusMessage.set(
        'Выберите PNG, JPEG или WebP размером не более 5 МБ.',
      );
      return;
    }

    this.avatarFile.set(file);
    this.statusMessage.set(null);
  }
}
