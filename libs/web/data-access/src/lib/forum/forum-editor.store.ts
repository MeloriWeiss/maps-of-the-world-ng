import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, finalize, forkJoin, fromEvent, of, tap } from 'rxjs';
import { CurrentAccountStore } from '../profile';
import { ForumService } from './forum.service';
import { CreateForumDiscussion, ForumCategory } from './interfaces/discussion';

@Injectable()
export class ForumEditorStore {
  readonly #api = inject(ForumService);
  readonly #account = inject(CurrentAccountStore);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  #id: number | null = null;
  #key = '';
  #original = '';
  #draftPending = false;
  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(160),
      ],
    }),
    category: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    post: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(20000),
      ],
    }),
  });
  readonly categories = signal<ForumCategory[]>([]);
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly draftStatus = signal('');
  readonly dirty = signal(false);
  readonly preview = signal<CreateForumDiscussion>({
    title: '',
    category: '',
    post: '',
  });

  constructor() {
    this.form.valueChanges
      .pipe(
        tap(() => {
          const value = this.form.getRawValue();
          this.preview.set(value);
          this.dirty.set(JSON.stringify(value) !== this.#original);
          if (!this.ready()) return;
          this.#draftPending = true;
          this.draftStatus.set('Сохраняем черновик…');
        }),
        debounceTime(400),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.#saveDraft());
    this.#destroyRef.onDestroy(() => this.#saveDraft());
    const window = this.#document.defaultView;
    if (window) {
      fromEvent(window, 'pagehide')
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => this.#saveDraft());
    }
  }

  #saveDraft() {
    if (!this.#draftPending) return;
    this.#draftPending = false;
    try {
      this.#document.defaultView?.localStorage.setItem(
        this.#key,
        JSON.stringify(this.form.getRawValue()),
      );
      this.draftStatus.set('Черновик сохранён в этом браузере');
    } catch {
      this.draftStatus.set('Не удалось сохранить черновик в браузере');
    }
  }

  load(id: number | null, category: string) {
    this.#saveDraft();
    this.#id = id;
    this.#key =
      'gmhelper.forum-draft.' + this.#account.user()?.id + '.' + (id ?? 'new');
    this.loading.set(true);
    this.ready.set(false);
    this.error.set('');
    forkJoin({
      categories: this.#api.categories(),
      discussion: id ? this.#api.discussion(id, false) : of(null),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ categories, discussion }) => {
          if (discussion && !discussion.canEdit) {
            this.error.set('Редактирование этой темы недоступно.');
            return;
          }
          this.categories.set(categories);
          let value: CreateForumDiscussion = discussion
            ? {
                title: discussion.title,
                post: discussion.post,
                category: discussion.category.slug,
              }
            : {
                title: '',
                post: '',
                category: categories.some((item) => item.slug === category)
                  ? category
                  : '',
              };
          this.#original = JSON.stringify(value);
          try {
            const draft: unknown = JSON.parse(
              this.#document.defaultView?.localStorage.getItem(this.#key) ??
                'null',
            );
            if (isForumDraft(draft)) {
              value = draft;
              this.draftStatus.set('Восстановлен черновик из этого браузера');
            }
          } catch {
            this.draftStatus.set('Черновик недоступен');
          }
          this.form.setValue(value);
          this.ready.set(true);
        },
        error: () =>
          this.error.set('Не удалось загрузить редактор. Попробуйте ещё раз.'),
      });
  }

  save(onSuccess: (id: number) => void) {
    if (!this.ready() || this.pending()) return;
    const value = this.form.getRawValue();
    this.form.setValue({
      title: value.title.trim(),
      post: value.post.trim(),
      category: value.category,
    });
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.pending.set(true);
    this.error.set('');
    const request = this.#id
      ? this.#api.editDiscussion(this.#id, this.form.getRawValue())
      : this.#api.createDiscussion(this.form.getRawValue());
    request
      .pipe(
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ id }) => {
          this.#draftPending = false;
          this.dirty.set(false);
          this.#original = JSON.stringify(this.form.getRawValue());
          try {
            this.#document.defaultView?.localStorage.removeItem(this.#key);
          } catch {
            /* Publication succeeded; storage may be unavailable. */
          }
          onSuccess(id);
        },
        error: () =>
          this.error.set(
            'Не удалось опубликовать тему. Текст сохранён в форме. Проверьте соединение и попробуйте ещё раз.',
          ),
      });
  }
}

export function isForumDraft(value: unknown): value is CreateForumDiscussion {
  return (
    !!value &&
    typeof value === 'object' &&
    'title' in value &&
    typeof value.title === 'string' &&
    value.title.length <= 160 &&
    'post' in value &&
    typeof value.post === 'string' &&
    value.post.length <= 20000 &&
    'category' in value &&
    typeof value.category === 'string'
  );
}
