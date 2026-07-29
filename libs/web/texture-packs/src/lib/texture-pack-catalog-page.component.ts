import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PublishedTexturePackView,
  TexturePacksService,
} from '@wm/web/data-access/texture-packs';
import { finalize } from 'rxjs';
import { EmptyStateComponent } from '@wm/web/common-ui';
import { TexturePackPreviewSliderComponent } from './texture-pack-preview-slider/texture-pack-preview-slider.component';

@Component({
  selector: 'wm-texture-pack-catalog-page',
  imports: [RouterLink, EmptyStateComponent, TexturePackPreviewSliderComponent],
  templateUrl: './texture-pack-catalog-page.component.html',
  styleUrl: './texture-pack-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackCatalogPageComponent {
  #texturePacksService = inject(TexturePacksService);

  authorUserId = input<number>();
  embedded = input(false);
  packs = signal<PublishedTexturePackView[]>([]);
  isLoading = signal(true);
  hasError = signal(false);

  constructor() {
    effect(() => this.load(this.authorUserId()));
  }

  load(authorUserId = this.authorUserId()) {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.#texturePacksService
      .listPublished(authorUserId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (packs) => this.packs.set(packs),
        error: () => this.hasError.set(true),
      });
  }
}
