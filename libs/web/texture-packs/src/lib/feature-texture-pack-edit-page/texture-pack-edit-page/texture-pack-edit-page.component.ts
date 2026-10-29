import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ConfirmationModalComponent,
  ModalService,
  SuccessToastComponent,
  ToastService,
} from '@wm/web/common-ui';
import {
  TexturePackDetails,
  TexturePacksService,
  TexturePackDetailsFacade,
} from '@wm/web/data-access/texture-packs';
import { finalize, firstValueFrom } from 'rxjs';

import { TextureKind } from '@wm/shared/workshop';

import { TextureCard } from '../../interfaces/texture-card';
import { TexturePackDetailsFormComponent } from './texture-pack-details-form/texture-pack-details-form.component';
import { TextureEditorCardComponent } from './texture-editor-card/texture-editor-card.component';
import { toTextureCard } from '../../utils/texture-card.mapper';
import {
  toTextureSections,
  toTextureGallery,
} from '../../utils/texture-gallery.mapper';

/** Редактор метаданных, публикации и содержимого собственного набора. */
@Component({
  selector: 'wm-texture-pack-edit-page',
  imports: [
    RouterLink,
    TexturePackDetailsFormComponent,
    TextureEditorCardComponent,
  ],
  templateUrl: './texture-pack-edit-page.component.html',
  styleUrl: './texture-pack-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackEditPageComponent {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #texturePacksService = inject(TexturePacksService);
  #detailsFacade = inject(TexturePackDetailsFacade);
  #modalService = inject(ModalService);
  #toastService = inject(ToastService);
  #destroyRef = inject(DestroyRef);
  #pageSize = 48;

  readonly updatingKinds = signal<ReadonlySet<string>>(new Set());

  readonly packId = this.#route.snapshot.paramMap.get('id') ?? '';
  readonly pack = signal<TexturePackDetails | null>(null);
  readonly textures = signal<Record<TextureKind, TextureCard[]>>({
    SURFACE: [],
    STAMP: [],
  });
  readonly totals = signal<Record<TextureKind, number>>({
    SURFACE: 0,
    STAMP: 0,
  });
  readonly total = signal(0);
  readonly pages = signal<Record<TextureKind, number>>({
    SURFACE: 1,
    STAMP: 1,
  });
  readonly isLoading = signal(true);
  readonly loadingMoreKind = signal<TextureKind | null>(null);
  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly uploadingKind = signal<TextureKind | null>(null);
  readonly deletingTextureId = signal<string | null>(null);
  readonly isDeletingPack = signal(false);
  readonly isPublishing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly loadedTotal = computed(
    () => this.textures().SURFACE.length + this.textures().STAMP.length,
  );
  readonly sections = computed(() =>
    toTextureSections(this.textures(), this.totals(), this.loadingMoreKind()),
  );

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

  /** Загружает набор владельца и заполняет форму и галерею. */
  load() {
    if (!this.packId) {
      this.isLoading.set(false);
      this.errorMessage.set('Некорректный идентификатор текстур-пака.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.#detailsFacade
      .loadOwned(this.packId, this.#pageSize)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ pack, surfaces, stamps }) => {
          this.pack.set(pack);
          const gallery = toTextureGallery(surfaces, stamps);

          this.textures.set(gallery.textures);
          this.totals.set(gallery.totals);
          this.total.set(gallery.total);
          this.pages.set(gallery.pages);
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

  /** Проверяет форму и сохраняет очищенные от краевых пробелов метаданные. */
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

  async updateKind(texture: TextureCard, kind: TextureKind) {
    if (this.updatingKinds().has(texture.id)) return;
    this.updatingKinds.update((ids) => new Set([...ids, texture.id]));
    try {
      await firstValueFrom(
        this.#texturePacksService.updateTextureKind(
          this.packId,
          texture.id,
          kind,
        ),
      );
      this.#reloadTextures();
    } catch {
      this.errorMessage.set('Не удалось изменить тип текстуры.');
      this.#reloadTextures();
    } finally {
      this.updatingKinds.update(
        (ids) => new Set([...ids].filter((id) => id !== texture.id)),
      );
    }
  }

  uploadTextures(event: Event, kind: TextureKind) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) return;

    const files = Array.from(input.files);
    input.value = '';
    if (files.length > 50) {
      this.errorMessage.set('За один раз можно загрузить не более 50 файлов.');
      return;
    }

    this.isUploading.set(true);
    this.uploadingKind.set(kind);
    this.errorMessage.set(null);

    this.#texturePacksService
      .upload(this.packId, files, kind)
      .pipe(
        finalize(() => {
          this.isUploading.set(false);
          this.uploadingKind.set(null);
        }),
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

  loadMore(kind: TextureKind) {
    if (
      this.textures()[kind].length >= this.totals()[kind] ||
      this.loadingMoreKind()
    )
      return;

    const nextPage = this.pages()[kind] + 1;
    this.loadingMoreKind.set(kind);
    this.errorMessage.set(null);

    this.#texturePacksService
      .listOwnedTextures(this.packId, nextPage, this.#pageSize, kind)
      .pipe(
        finalize(() => this.loadingMoreKind.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.textures.update((textures) => ({
            ...textures,
            [kind]: [...textures[kind], ...result.items.map(toTextureCard)],
          }));
          this.totals.update((totals) => ({ ...totals, [kind]: result.total }));
          this.total.set(this.totals().SURFACE + this.totals().STAMP);
          this.pages.update((pages) => ({ ...pages, [kind]: nextPage }));
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
          'Текстура исчезнет из пака. На уже созданных картах она сохранится; файл удалится автоматически, когда ссылок на него не останется.',
        agreeBtnText: 'Удалить',
        rejectBtnText: 'Отмена',
      }),
    );
    if (!confirmed || this.deletingTextureId()) return;

    this.deletingTextureId.set(texture.id);
    this.errorMessage.set(null);

    this.#texturePacksService
      .removeOwnedTexture(this.packId, texture.id)
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
          'Пак и его текстуры исчезнут из каталога. На уже созданных картах изображения сохранятся до удаления последних ссылок.',
        agreeBtnText: 'Удалить пак',
        rejectBtnText: 'Отмена',
      }),
    );
    if (!confirmed) return;

    this.isDeletingPack.set(true);
    this.errorMessage.set(null);

    this.#texturePacksService
      .removeOwned(pack.id)
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
    this.#detailsFacade
      .reloadOwnedTextures(this.packId, this.#pageSize)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ surfaces, stamps }) => {
          const gallery = toTextureGallery(surfaces, stamps);
          const total = gallery.total;

          this.textures.set(gallery.textures);
          this.totals.set(gallery.totals);
          this.total.set(total);
          this.pages.set(gallery.pages);

          this.pack.update((pack) =>
            pack
              ? {
                  ...pack,
                  ...(total === 0
                    ? { isPublished: false, publishedAt: null }
                    : {}),
                  _count: { textures: total },
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
}
