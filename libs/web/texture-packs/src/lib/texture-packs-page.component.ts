import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  TexturePacksService,
  TexturePackView,
} from '@wm/web/data-access/texture-packs';
import { finalize } from 'rxjs';
import { EmptyStateComponent } from '@wm/web/common-ui';
import { TexturePackPreviewSliderComponent } from './texture-pack-preview-slider/texture-pack-preview-slider.component';
import { RouterLink } from '@angular/router';

type TexturePackList = 'drafts' | 'published';

@Component({
  selector: 'wm-texture-packs-page',
  imports: [
    ReactiveFormsModule,
    EmptyStateComponent,
    TexturePackPreviewSliderComponent,
    RouterLink,
  ],
  templateUrl: './texture-packs-page.component.html',
  styleUrl: './texture-packs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePacksPageComponent {
  #texturePacksService = inject(TexturePacksService);

  packs = signal<TexturePackView[]>([]);
  isLoading = signal(true);
  isCreating = signal(false);
  publishingPackId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  embedded = input(false);
  activeList = signal<TexturePackList>('drafts');
  draftPacks = computed(() => this.packs().filter((pack) => !pack.isPublished));
  publishedPacks = computed(() =>
    this.packs().filter((pack) => pack.isPublished),
  );
  visiblePacks = computed(() =>
    this.activeList() === 'drafts' ? this.draftPacks() : this.publishedPacks(),
  );

  createForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  constructor() {
    this.loadPacks();
  }

  loadPacks() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .listMine()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (packs) => this.packs.set(packs),
        error: () => {
          this.errorMessage.set('Не удалось загрузить текстур-паки.');
        },
      });
  }

  createPack() {
    if (this.createForm.invalid || this.isCreating()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const { name, description } = this.createForm.getRawValue();
    this.isCreating.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .create({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: () => {
          this.createForm.reset();
          this.activeList.set('drafts');
          this.loadPacks();
        },
        error: () => {
          this.errorMessage.set('Не удалось создать текстур-пак.');
        },
      });
  }

  togglePublication(pack: TexturePackView) {
    if (this.publishingPackId()) return;
    this.publishingPackId.set(pack.id);
    this.errorMessage.set(null);
    this.#texturePacksService
      .updatePublication(pack.id, !pack.isPublished)
      .pipe(finalize(() => this.publishingPackId.set(null)))
      .subscribe({
        next: () => {
          this.activeList.set(pack.isPublished ? 'drafts' : 'published');
          this.loadPacks();
        },
        error: () => {
          this.errorMessage.set(
            pack.isPublished
              ? 'Не удалось снять текстур-пак с публикации.'
              : 'Добавьте хотя бы одну текстуру перед публикацией.',
          );
        },
      });
  }

  selectList(list: TexturePackList) {
    this.activeList.set(list);
  }
}
