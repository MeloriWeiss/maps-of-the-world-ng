import {
  ChangeDetectionStrategy,
  Component,
  inject,
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

@Component({
  selector: 'wm-texture-packs-page',
  imports: [ReactiveFormsModule],
  templateUrl: './texture-packs-page.component.html',
  styleUrl: './texture-packs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePacksPageComponent {
  #texturePacksService = inject(TexturePacksService);

  packs = signal<TexturePackView[]>([]);
  isLoading = signal(true);
  isCreating = signal(false);
  uploadingPackId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

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
      .list()
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
          this.loadPacks();
        },
        error: () => {
          this.errorMessage.set('Не удалось создать текстур-пак.');
        },
      });
  }

  uploadTextures(packId: string, event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) return;

    const files = Array.from(input.files);
    input.value = '';
    this.uploadingPackId.set(packId);
    this.errorMessage.set(null);
    this.#texturePacksService
      .upload(packId, files)
      .pipe(finalize(() => this.uploadingPackId.set(null)))
      .subscribe({
        next: () => this.loadPacks(),
        error: () => {
          this.errorMessage.set(
            'Не удалось загрузить текстуры. Допустимы PNG, JPEG и WebP до 5 МБ.',
          );
        },
      });
  }
}
