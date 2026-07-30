import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ConfirmationModalComponent,
  EmptyStateComponent,
  ModalService,
  SuccessToastComponent,
  ToastService,
} from '@wm/web/common-ui';
import {
  TextureItemView,
  TexturePackDetails,
  TexturePacksService,
} from '@wm/web/data-access/texture-packs';
import { finalize, firstValueFrom, forkJoin } from 'rxjs';

interface TextureCard extends TextureItemView {
  displaySize: string;
}

@Component({
  selector: 'wm-texture-pack-edit-page',
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent],
  templateUrl: './texture-pack-edit-page.component.html',
  styleUrl: './texture-pack-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackEditPageComponent {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #texturePacksService = inject(TexturePacksService);
  #modalService = inject(ModalService);
  #toastService = inject(ToastService);
  #destroyRef = inject(DestroyRef);
  #pageSize = 48;

  readonly packId = this.#route.snapshot.paramMap.get('id') ?? '';
  readonly pack = signal<TexturePackDetails | null>(null);
  readonly textures = signal<TextureCard[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly deletingTextureId = signal<string | null>(null);
  readonly isDeletingPack = signal(false);
  readonly isPublishing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hasMore = computed(() => this.textures().length < this.total());

  readonly form = new FormGroup({
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
    this.load();
  }

  load() {
    if (!this.packId) {
      this.isLoading.set(false);
      this.errorMessage.set('Некорректный идентификатор текстур-пака.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      pack: this.#texturePacksService.get(this.packId),
      textures: this.#texturePacksService.listTextures(
        this.packId,
        1,
        this.#pageSize,
      ),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ pack, textures }) => {
          this.pack.set(pack);
          this.textures.set(
            textures.items.map((texture) => this.#toTextureCard(texture)),
          );
          this.total.set(textures.total);
          this.page.set(1);
          this.form.setValue({
            name: pack.name,
            description: pack.description ?? '',
          });
        },
        error: () =>
          this.errorMessage.set(
            'Не удалось загрузить текстур-пак. Возможно, он удалён или принадлежит другому пользователю.',
          ),
      });
  }

  saveDetails() {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .update(this.packId, {
        name: value.name.trim(),
        description: value.description.trim(),
      })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (pack) => {
          this.pack.set(pack);
          this.form.markAsPristine();
          this.#toastService.show(SuccessToastComponent, {
            message: 'Изменения текстур-пака сохранены',
          });
        },
        error: () =>
          this.errorMessage.set('Не удалось сохранить название и описание.'),
      });
  }

  uploadTextures(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) return;

    const files = Array.from(input.files);
    input.value = '';
    if (files.length > 50) {
      this.errorMessage.set('За один раз можно загрузить не более 50 файлов.');
      return;
    }

    this.isUploading.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .upload(this.packId, files)
      .pipe(
        finalize(() => this.isUploading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#toastService.show(SuccessToastComponent, {
            message: 'Текстуры добавлены в пак',
          });
          this.#reloadTextures();
        },
        error: () =>
          this.errorMessage.set(
            'Не удалось загрузить текстуры. Допустимы PNG, JPEG и WebP до 5 МБ.',
          ),
      });
  }

  loadMore() {
    if (!this.hasMore() || this.isLoadingMore()) return;

    const nextPage = this.page() + 1;
    this.isLoadingMore.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .listTextures(this.packId, nextPage, this.#pageSize)
      .pipe(
        finalize(() => this.isLoadingMore.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.textures.update((textures) => [
            ...textures,
            ...result.items.map((texture) => this.#toTextureCard(texture)),
          ]);
          this.total.set(result.total);
          this.page.set(nextPage);
        },
        error: () =>
          this.errorMessage.set('Не удалось загрузить следующую страницу.'),
      });
  }

  async removeTexture(texture: TextureCard) {
    const confirmed = await firstValueFrom(
      this.#modalService.show<boolean>(ConfirmationModalComponent, {
        title: `Удалить текстуру «${texture.name}»?`,
        subtitle:
          'Файл будет удалён из пака и хранилища без возможности восстановления.',
        agreeBtnText: 'Удалить',
        rejectBtnText: 'Отмена',
      }),
    );
    if (!confirmed || this.deletingTextureId()) return;

    this.deletingTextureId.set(texture.id);
    this.errorMessage.set(null);
    this.#texturePacksService
      .removeTexture(this.packId, texture.id)
      .pipe(
        finalize(() => this.deletingTextureId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#reloadTextures();
        },
        error: () =>
          this.errorMessage.set('Не удалось удалить текстуру из пака.'),
      });
  }

  togglePublication() {
    const pack = this.pack();
    if (!pack || this.isPublishing()) return;

    this.isPublishing.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .updatePublication(pack.id, !pack.isPublished)
      .pipe(
        finalize(() => this.isPublishing.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ isPublished, publishedAt }) => {
          this.pack.update((current) =>
            current ? { ...current, isPublished, publishedAt } : current,
          );
        },
        error: () =>
          this.errorMessage.set(
            pack.isPublished
              ? 'Не удалось снять пак с публикации.'
              : 'Добавьте хотя бы одну текстуру перед публикацией.',
          ),
      });
  }

  async removePack() {
    const pack = this.pack();
    if (!pack || this.isDeletingPack()) return;

    const confirmed = await firstValueFrom(
      this.#modalService.show<boolean>(ConfirmationModalComponent, {
        title: `Удалить текстур-пак «${pack.name}»?`,
        subtitle:
          'Все текстуры внутри пака также будут удалены без возможности восстановления.',
        agreeBtnText: 'Удалить пак',
        rejectBtnText: 'Отмена',
      }),
    );
    if (!confirmed) return;

    this.isDeletingPack.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .remove(pack.id)
      .pipe(
        finalize(() => this.isDeletingPack.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#toastService.show(SuccessToastComponent, {
            message: `Текстур-пак «${pack.name}» удалён`,
          });
          void this.#router.navigate(['/profile', 'me', 'texture-packs']);
        },
        error: () => this.errorMessage.set('Не удалось удалить текстур-пак.'),
      });
  }

  #reloadTextures() {
    this.#texturePacksService
      .listTextures(this.packId, 1, this.#pageSize)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.textures.set(
            result.items.map((texture) => this.#toTextureCard(texture)),
          );
          this.total.set(result.total);
          this.page.set(1);
          this.pack.update((pack) =>
            pack
              ? {
                  ...pack,
                  ...(result.total === 0
                    ? { isPublished: false, publishedAt: null }
                    : {}),
                  _count: { textures: result.total },
                }
              : pack,
          );
        },
        error: () =>
          this.errorMessage.set(
            'Текстуры добавлены, но галерею не удалось обновить.',
          ),
      });
  }

  #toTextureCard(texture: TextureItemView): TextureCard {
    return {
      ...texture,
      displaySize:
        texture.size < 1_000_000
          ? `${Math.ceil(texture.size / 1_000)} КБ`
          : `${(texture.size / 1_000_000).toFixed(1)} МБ`,
    };
  }
}
