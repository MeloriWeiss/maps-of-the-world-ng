import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, map, startWith, take } from 'rxjs';
import { ForumMessage, ForumThreadStore } from '@wm/web/data-access/forum';
import {
  AvatarComponent,
  PaginationComponent,
  PaginationService,
  ConfirmationModalComponent,
  ModalService,
  RouteAnchorDirective,
} from '@wm/web/common-ui';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { SeoService } from '@wm/web/shared';

/** Страница обсуждения с публикацией, комментариями и действиями пользователя. */
@Component({
  selector: 'wm-forum-page',
  standalone: true,
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    ReactiveFormsModule,
    AvatarComponent,
    PaginationComponent,
    RouteAnchorDirective,
  ],
  providers: [ForumThreadStore, PaginationService],
  templateUrl: './forum-page.component.html',
  styleUrl: './forum-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPageComponent {
  #previousComposerText = '';
  readonly store = inject(ForumThreadStore);
  readonly account = inject(CurrentAccountStore);
  readonly #pagination = inject(PaginationService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #seo = inject(SeoService);
  readonly #modal = inject(ModalService);
  readonly text = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(5000)],
  });
  readonly id = signal(0);
  readonly page = signal(1);
  readonly commentId = signal<number | undefined>(undefined);
  readonly showPreview = signal(false);
  readonly composerMessageId = computed(() => {
    const id = (this.store.editing() ?? this.store.replyTo())?.id;
    return id &&
      this.store.tree
        .rows()
        .some((row) => row.kind === 'message' && row.message.id === id)
      ? id
      : null;
  });

  constructor() {
    this.#pagination.pageQueryParams.set({ comment: null });
    effect(() => {
      const page = this.store.comments()?.page ?? this.page();
      this.#pagination.currentPage.set(page);
      this.#pagination.maxPage.set(Math.max(page, this.store.pageCount()));
    });
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        map(() => ({
          params: this.#route.snapshot.paramMap,
          query: this.#route.snapshot.queryParamMap,
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.params.get('id') === current.params.get('id') &&
            ['page', 'comment'].every(
              (key) => previous.query.get(key) === current.query.get(key),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ params, query }) => {
        const id = Number(params.get('id'));
        if (id !== this.id()) {
          this.text.reset();
          this.store.replyTo.set(null);
          this.store.editing.set(null);
        }
        this.id.set(id);
        this.page.set(Math.max(1, Math.floor(Number(query.get('page')) || 1)));
        const comment = Number(query.get('comment'));
        this.commentId.set(
          Number.isInteger(comment) && comment > 0 ? comment : undefined,
        );
        this.reload();
      });
    effect(() => {
      const item = this.store.discussion();
      if (item)
        this.#seo.update(
          {
            title: item.title,
            description: item.post.replace(/\s+/g, ' ').slice(0, 160),
            index: this.page() === 1 && !this.commentId(),
            canonicalPath: '/forum/' + item.id,
            type: 'article',
            structuredData: {
              '@context': 'https://schema.org',
              '@type': 'DiscussionForumPosting',
              headline: item.title,
              text: item.post,
              datePublished: item.createdAt,
              dateModified: item.updatedAt,
              author: { '@type': 'Person', name: item.author.nickname },
              commentCount: item.commentsCount,
            },
          },
          '/forum/' + item.id,
        );
      else if (this.store.error())
        this.#seo.update(
          {
            title: 'Обсуждение недоступно',
            description: 'Тема не найдена или временно недоступна.',
            index: false,
          },
          '/forum/' + this.id(),
        );
    });
  }

  reload() {
    this.store.load(this.id(), this.page(), this.commentId());
  }
  reply(item: ForumMessage) {
    if (this.store.pending()) return;
    if (this.store.editing()) this.text.setValue(this.#previousComposerText);
    this.store.editing.set(null);
    this.store.replyTo.set(item);
    void this.#router.navigate([], {
      fragment: 'reply-form',
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
  }
  edit(item: ForumMessage) {
    if (this.store.pending()) return;
    const begin = () => {
      if (!this.store.editing()) this.#previousComposerText = this.text.value;
      this.store.replyTo.set(null);
      this.store.editing.set(item);
      this.text.setValue(item.text);
      void this.#router.navigate([], {
        fragment: 'reply-form',
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      });
    };
    if (!this.text.value.trim()) {
      begin();
      return;
    }
    this.confirm('Заменить текст в форме?', begin);
  }
  cancelContext() {
    if (this.store.editing()) this.text.setValue(this.#previousComposerText);
    this.store.replyTo.set(null);
    this.store.editing.set(null);
  }
  submit() {
    this.text.markAsTouched();
    if (this.text.invalid || !this.text.value.trim()) return;
    this.store.publish(this.text.value, (id) => {
      this.text.reset();
      this.showPreview.set(false);
      if (this.commentId() === id) {
        this.reload();
        return;
      }
      void this.#router.navigate([], {
        queryParams: { comment: id },
        fragment: 'comment-' + id,
      });
    });
  }
  toggleClosed() {
    const item = this.store.discussion();
    if (item)
      this.confirm(
        item.isClosed
          ? 'Открыть тему для ответов?'
          : 'Закрыть тему для новых ответов?',
        () => this.store.moderate({ isClosed: !item.isClosed }),
      );
  }
  togglePinned() {
    const item = this.store.discussion();
    if (item) this.store.moderate({ isPinned: !item.isPinned });
  }
  moderateComment(item: ForumMessage) {
    this.confirm(
      item.isHidden
        ? 'Восстановить сообщение?'
        : 'Скрыть сообщение? Ответы на него сохранятся.',
      () => this.store.setCommentVisibility(item),
    );
  }
  confirm(title: string, action: () => void) {
    this.#modal
      .show<boolean>(ConfirmationModalComponent, {
        title,
        agreeBtnText: 'Подтвердить',
        rejectBtnText: 'Отмена',
      })
      .pipe(
        take(1),
        filter((confirmed) => confirmed === true),
      )
      .subscribe(action);
  }
}
