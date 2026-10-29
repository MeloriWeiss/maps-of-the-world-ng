import type { CurrentAccountState } from '../interfaces';
import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ProfileSummaryDto } from '@wm/shared/accounts';
import type { UserResponseDto } from '@wm/shared/users';
import { BaseStore } from '../../store';
import { ProfileService } from '../services';

const initialState: CurrentAccountState = {
  user: null,
  profile: null,
  isProfileLoading: false,
};

/**
 * Хранит текущего пользователя и сводку его профиля.
 * Версия запроса не позволяет применить устаревший ответ после смены аккаунта
 * или очистки состояния.
 */
@Injectable({ providedIn: 'root' })
export class CurrentAccountStore extends BaseStore<CurrentAccountState> {
  readonly #profileService = inject(ProfileService);
  readonly #destroyRef = inject(DestroyRef);
  #profileRequestVersion = 0;

  readonly user = computed(() => this.state().user);
  readonly profile = computed(() => this.state().profile);
  readonly avatarUrl = computed(() => this.profile()?.avatarUrl ?? null);
  readonly isProfileLoading = computed(() => this.state().isProfileLoading);

  constructor() {
    super(initialState);
  }

  /** Обновляет пользователя и при необходимости загружает сводку профиля. */
  authenticate(user: UserResponseDto) {
    const isSameUser = this.user()?.id === user.id;

    if (isSameUser) {
      this.patchState({ user });

      if (!this.profile() && !this.isProfileLoading()) this.reloadProfile();

      return;
    }

    this.#profileRequestVersion += 1;
    this.patchState({ user, profile: null, isProfileLoading: false });
    this.reloadProfile();
  }

  /** Сбрасывает аккаунт и делает ответы ранее начатых загрузок неактуальными. */
  clear() {
    this.#profileRequestVersion += 1;
    this.resetState();
  }

  /** Загружает сводку, пропуская повторный вызов во время текущей загрузки. */
  reloadProfile() {
    if (this.isProfileLoading()) return;

    const requestVersion = ++this.#profileRequestVersion;
    this.patchState({ isProfileLoading: true });

    this.#profileService
      .getProfileSummary()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (profile) => {
          if (requestVersion !== this.#profileRequestVersion) return;

          this.patchState({ profile, isProfileLoading: false });
        },
        error: () => {
          if (requestVersion !== this.#profileRequestVersion) return;

          this.patchState({ isProfileLoading: false });
        },
      });
  }

  /** Применяет частичное изменение только к уже загруженной сводке. */
  updateProfile(profile: Partial<ProfileSummaryDto>) {
    const currentProfile = this.profile();
    if (!currentProfile) return;

    this.patchState({ profile: { ...currentProfile, ...profile } });
  }
}
