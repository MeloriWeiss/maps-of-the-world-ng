import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  EMPTY,
  finalize,
  Observable,
  Subject,
  switchMap,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CurrentAccountStore } from '../../profile';
import { ForumService } from '../services/forum.service';
import { ForumCommentTree } from '../utils/forum-comment-tree';
import { ForumLoadFacade } from '../facades';
import type { ForumThreadQuery, ForumModerationRequest } from '../interfaces';
import {
  ForumCommentsPage,
  ForumDiscussionDetails,
  ForumMessage,
} from '../interfaces/discussion';

/** Состояние темы, дерева ответов и действий пользователя на странице обсуждения. */
@Injectable()
export class ForumThreadStore {
  readonly #api = inject(ForumService);
  readonly #loader = inject(ForumLoadFacade);
  readonly #account = inject(CurrentAccountStore);
  readonly #destroyRef = inject(DestroyRef);

  readonly tree = new ForumCommentTree(this.#api, this.#destroyRef);
  readonly #requests = new Subject<ForumThreadQuery>();

  readonly discussion = signal<ForumDiscussionDetails | null>(null);
  readonly comments = signal<ForumCommentsPage | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly pending = signal(false);

  readonly authorized = computed(() => !!this.#account.user());
  readonly moderator = computed(() =>
    ['ADMIN', 'SUPER_ADMIN'].includes(this.#account.user()?.role ?? ''),
  );
  readonly replyTo = signal<ForumMessage | null>(null);
  readonly editing = signal<ForumMessage | null>(null);

  readonly canWrite = computed(
    () => this.authorized() && !this.discussion()?.isClosed,
  );
  readonly pageCount = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.comments()?.total ?? 0) / (this.comments()?.pageSize ?? 20),
      ),
    ),
  );

  constructor() {
    this.#requests
      .pipe(
        switchMap((query) => this.#loadThread(query)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ discussion, comments }) => {
        this.discussion.set(discussion);
        this.comments.set(comments);
        this.tree.setRoots(discussion.id, comments);
      });
  }

  #loadThread({ id, page, commentId }: ForumThreadQuery) {
    this.loading.set(true);
    this.error.set('');

    if (this.discussion()?.id !== id) {
      this.discussion.set(null);
      this.comments.set(null);
      this.tree.clear();
    }

    return this.#loader.loadThread(id, page, commentId).pipe(
      catchError((error: unknown) => {
        this.discussion.set(null);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? 'Тема или сообщение не найдены.'
            : 'Не удалось загрузить обсуждение. Попробуйте ещё раз.',
        );

        return EMPTY;
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  /** Запрашивает тему, страницу комментариев и необязательное сообщение. */
  load(id: number, page: number, commentId?: number) {
    this.#requests.next({ id, page, commentId });
  }

  /** Создаёт комментарий или сохраняет его изменения. */
  publish(text: string, onSuccess: (id: number) => void) {
    const discussion = this.discussion();
    if (!discussion || !this.canWrite() || !text.trim() || this.pending())
      return;

    const editing = this.editing();
    const request = editing
      ? this.#api.editComment(discussion.id, editing.id, text.trim())
      : this.#api.createComment(discussion.id, {
          comment: text.trim(),
          parentId: this.replyTo()?.id,
        });

    this.run(request, ({ id }) => {
      this.replyTo.set(null);
      this.editing.set(null);
      onSuccess(id);
    });
  }

  /** Переключает отметку текущего пользователя у темы. */
  toggleLike() {
    const item = this.discussion();
    if (!item || !this.authorized()) return;

    this.run(
      item.isLiked ? this.#api.unlike(item.id) : this.#api.like(item.id),
      (state) => {
        this.discussion.update((current) =>
          current ? { ...current, ...state } : null,
        );
      },
    );
  }

  /** Сохраняет изменения модерации темы и обновляет её данные. */
  moderate(request: ForumModerationRequest) {
    const item = this.discussion();
    if (!item || !this.moderator()) return;

    this.run(this.#api.moderateDiscussion(item.id, request), () =>
      this.load(item.id, this.comments()?.page ?? 1),
    );
  }

  /** Переключает видимость комментария и обновляет текущую страницу. */
  setCommentVisibility(item: ForumMessage) {
    const discussion = this.discussion();
    if (!discussion || !this.moderator()) return;

    this.run(
      this.#api.moderateComment(discussion.id, item.id, !item.isHidden),
      () => this.load(discussion.id, this.comments()?.page ?? 1),
    );
  }

  /** Выполняет пользовательское действие с общей обработкой ожидания и ошибок. */
  run<T>(request: Observable<T>, success: (value: T) => void) {
    if (this.pending()) return;

    this.pending.set(true);
    this.actionError.set('');
    request
      .pipe(
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: success,
        error: (error: unknown) =>
          this.actionError.set(
            error instanceof HttpErrorResponse && error.status === 403
              ? 'Действие недоступно: проверьте права или обновите тему — она могла быть закрыта.'
              : 'Не удалось сохранить изменения. Текст сохранён в форме, попробуйте ещё раз.',
          ),
      });
  }
}
