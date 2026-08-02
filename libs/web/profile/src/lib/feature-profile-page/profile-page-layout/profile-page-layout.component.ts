import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import {
  ConfirmationModalComponent,
  ErrorToastComponent,
  ModalService,
  PopoverComponent,
  SuccessToastComponent,
  SvgComponent,
  ToastService,
} from '@wm/web/common-ui';
import {
  CurrentAccountStore,
  ProfileService,
} from '@wm/web/data-access/profile';
import { ProfileSummaryDto } from '@wm/shared/accounts';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, finalize, firstValueFrom, map } from 'rxjs';

const emptySummary: ProfileSummaryDto = {
  nickname: 'Профиль',
  avatarUrl: null,
  bio: null,
  createdAt: '',
  likesReceived: 0,
  publishedMapsCount: 0,
  publishedTexturePacksCount: 0,
};

@Component({
  selector: 'wm-profile-page-layout',
  imports: [
    RouterOutlet,
    SvgComponent,
    RouterLink,
    RouterLinkActive,
    PopoverComponent,
  ],
  templateUrl: './profile-page-layout.component.html',
  styleUrl: './profile-page-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageLayoutComponent {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #profileService = inject(ProfileService);
  #currentAccountStore = inject(CurrentAccountStore);
  #destroyRef = inject(DestroyRef);
  #modalService = inject(ModalService);
  #toastService = inject(ToastService);
  #publicSummary = signal<ProfileSummaryDto>(emptySummary);

  readonly isEditing = toSignal(
    this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.endsWith('/edit')),
    ),
    { initialValue: this.#router.url.endsWith('/edit') },
  );
  readonly profileId = this.#route.parent?.snapshot.paramMap.get('id') ?? 'me';
  readonly isOwnProfile = this.profileId === 'me';
  readonly summary = computed(() =>
    this.isOwnProfile
      ? (this.#currentAccountStore.profile() ?? emptySummary)
      : this.#publicSummary(),
  );
  readonly isAvatarUpdating = signal(false);
  readonly memberSince = computed(() => {
    const createdAt = this.summary().createdAt;
    if (!createdAt) return '';

    const date = new Date(createdAt);
    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  });

  constructor() {
    if (this.isOwnProfile) {
      if (!this.#currentAccountStore.profile()) {
        this.#currentAccountStore.reloadProfile();
      }
      return;
    }

    this.#profileService
      .getProfileSummary(Number(this.profileId))
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({ next: (summary) => this.#publicSummary.set(summary) });
  }

  selectAvatar(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.isAvatarUpdating()) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 5_000_000) {
      this.#showAvatarError(
        'Выберите PNG, JPEG или WebP размером не более 5 МБ.',
      );
      return;
    }

    this.isAvatarUpdating.set(true);
    this.#profileService
      .uploadAvatar(file)
      .pipe(
        finalize(() => this.isAvatarUpdating.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ avatarUrl }) => {
          this.#currentAccountStore.updateProfile({ avatarUrl });
          this.#toastService.show(SuccessToastComponent, {
            message: 'Аватар обновлён',
          });
        },
        error: () => this.#showAvatarError('Не удалось загрузить аватар.'),
      });
  }

  async removeAvatar() {
    if (!this.summary().avatarUrl || this.isAvatarUpdating()) return;
    const confirmed = await firstValueFrom(
      this.#modalService.show<boolean>(ConfirmationModalComponent, {
        title: 'Удалить аватар?',
        subtitle: 'В профиле снова будет отображаться стандартное изображение.',
        agreeBtnText: 'Удалить аватар',
        rejectBtnText: 'Отмена',
      }),
    );
    if (!confirmed) return;

    this.isAvatarUpdating.set(true);
    this.#profileService
      .removeAvatar()
      .pipe(
        finalize(() => this.isAvatarUpdating.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#currentAccountStore.updateProfile({ avatarUrl: null });
          this.#toastService.show(SuccessToastComponent, {
            message: 'Аватар удалён',
          });
        },
        error: () => this.#showAvatarError('Не удалось удалить аватар.'),
      });
  }

  #showAvatarError(message: string) {
    this.#toastService.show(ErrorToastComponent, { message });
  }
}
