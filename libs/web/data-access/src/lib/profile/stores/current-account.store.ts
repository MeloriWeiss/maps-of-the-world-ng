import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileSummaryDto } from '@wm/shared/accounts';
import { UserResponseDto } from '@wm/shared/users';
import { BaseStore } from '../../store';
import { ProfileService } from '../services';

interface CurrentAccountState {
  user: UserResponseDto | null;
  profile: ProfileSummaryDto | null;
  isProfileLoading: boolean;
}

const initialState: CurrentAccountState = {
  user: null,
  profile: null,
  isProfileLoading: false,
};

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

  clear() {
    this.#profileRequestVersion += 1;
    this.resetState();
  }

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

  updateProfile(profile: Partial<ProfileSummaryDto>) {
    const currentProfile = this.profile();
    if (!currentProfile) return;
    this.patchState({ profile: { ...currentProfile, ...profile } });
  }
}
