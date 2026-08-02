import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  ConfirmationModalComponent,
  EmptyStateComponent,
  ModalService,
  SvgComponent,
} from '@wm/web/common-ui';
import { MapsService } from '@wm/web/data-access/maps';
import {
  FavouriteMap,
  FavouriteTexturePack,
  ProfileService,
} from '@wm/web/data-access/profile';
import { TexturePacksService } from '@wm/web/data-access/texture-packs';
import { finalize, firstValueFrom } from 'rxjs';

type FavouriteFilter = 'all' | 'maps' | 'texture-packs';

@Component({
  selector: 'wm-profile-page-favourite',
  imports: [EmptyStateComponent, RouterLink, SvgComponent],
  templateUrl: './profile-page-favourite.component.html',
  styleUrl: './profile-page-favourite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageFavouriteComponent {
  #profileService = inject(ProfileService);
  #destroyRef = inject(DestroyRef);
  #mapsService = inject(MapsService);
  #texturePacksService = inject(TexturePacksService);
  #modalService = inject(ModalService);

  readonly maps = signal<FavouriteMap[]>([]);
  readonly texturePacks = signal<FavouriteTexturePack[]>([]);
  readonly activeFilter = signal<FavouriteFilter>('all');
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly removalError = signal<string | null>(null);
  readonly removingFavouriteId = signal<string | null>(null);
  readonly total = computed(
    () => this.maps().length + this.texturePacks().length,
  );
  readonly showMaps = computed(() => this.activeFilter() !== 'texture-packs');
  readonly showTexturePacks = computed(() => this.activeFilter() !== 'maps');
  readonly isActiveFilterEmpty = computed(() => {
    if (this.activeFilter() === 'maps') return this.maps().length === 0;
    if (this.activeFilter() === 'texture-packs') {
      return this.texturePacks().length === 0;
    }
    return this.total() === 0;
  });
  readonly emptyState = computed(() => {
    if (this.activeFilter() === 'maps') {
      return {
        title: 'Понравившихся карт пока нет',
        description: 'Карты, которые вы отметите, появятся в этом разделе.',
      };
    }
    if (this.activeFilter() === 'texture-packs') {
      return {
        title: 'Понравившихся текстур-паков пока нет',
        description:
          'Текстур-паки, которые вы отметите, появятся в этом разделе.',
      };
    }
    return {
      title: 'Понравившихся работ пока нет',
      description: 'Карты и текстур-паки, которые вы отметите, появятся здесь.',
    };
  });

  constructor() {
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.#profileService
      .getMyFavourites()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ maps, texturePacks }) => {
          this.maps.set(maps);
          this.texturePacks.set(texturePacks);
        },
        error: () => this.hasError.set(true),
      });
  }

  selectFilter(filter: FavouriteFilter) {
    this.activeFilter.set(filter);
  }

  async removeMap(map: FavouriteMap) {
    const operationId = `map-${map.id}`;
    if (this.removingFavouriteId()) return;

    const confirmed = await this.#confirmRemoval('карту', map.name);
    if (!confirmed || this.removingFavouriteId()) return;

    this.removingFavouriteId.set(operationId);
    this.removalError.set(null);
    this.#mapsService
      .unlike(map.id)
      .pipe(
        finalize(() => this.removingFavouriteId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () =>
          this.maps.update((maps) => maps.filter(({ id }) => id !== map.id)),
        error: () =>
          this.removalError.set('Не удалось убрать карту из понравившегося.'),
      });
  }

  async removeTexturePack(pack: FavouriteTexturePack) {
    const operationId = `texture-pack-${pack.id}`;
    if (this.removingFavouriteId()) return;

    const confirmed = await this.#confirmRemoval('текстур-пак', pack.name);
    if (!confirmed || this.removingFavouriteId()) return;

    this.removingFavouriteId.set(operationId);
    this.removalError.set(null);
    this.#texturePacksService
      .unlike(pack.id)
      .pipe(
        finalize(() => this.removingFavouriteId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () =>
          this.texturePacks.update((packs) =>
            packs.filter(({ id }) => id !== pack.id),
          ),
        error: () =>
          this.removalError.set(
            'Не удалось убрать текстур-пак из понравившегося.',
          ),
      });
  }

  #confirmRemoval(contentType: 'карту' | 'текстур-пак', name: string) {
    return firstValueFrom(
      this.#modalService.show<boolean>(ConfirmationModalComponent, {
        title: `Убрать ${contentType} «${name}» из понравившегося?`,
        subtitle:
          'Сам материал не будет удалён. Вы сможете снова добавить его в понравившееся в любой момент.',
        agreeBtnText: 'Убрать',
        rejectBtnText: 'Отмена',
      }),
    );
  }
}
