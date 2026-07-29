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
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { SvgComponent } from '@wm/web/common-ui';
import { ProfileService } from '@wm/web/data-access/profile';
import { ProfileSummaryDto } from '@wm/shared/accounts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, switchMap } from 'rxjs';

@Component({
  selector: 'wm-profile-page-layout',
  imports: [RouterOutlet, SvgComponent, RouterLink, RouterLinkActive],
  templateUrl: './profile-page-layout.component.html',
  styleUrl: './profile-page-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageLayoutComponent {
  #route = inject(ActivatedRoute);
  #profileService = inject(ProfileService);
  #destroyRef = inject(DestroyRef);

  readonly profileId = this.#route.parent?.snapshot.paramMap.get('id') ?? 'me';
  readonly isOwnProfile = this.profileId === 'me';
  readonly summary = signal<ProfileSummaryDto>({
    nickname: 'Профиль',
    avatarUrl: null,
    bio: null,
    createdAt: '',
    likesReceived: 0,
    publishedMapsCount: 0,
    publishedTexturePacksCount: 0,
  });
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
    this.#profileService.profileChanges$
      .pipe(
        startWith(undefined),
        switchMap(() =>
          this.#profileService.getProfileSummary(
            this.isOwnProfile ? undefined : Number(this.profileId),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (summary) => this.summary.set(summary),
      });
  }
}
