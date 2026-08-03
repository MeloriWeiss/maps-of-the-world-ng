import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { DeskListComponent, ErrorComponent } from '@wm/web/common-ui';
import { AuthService } from '@wm/web/data-access/auth';
import {
  ForumDiscussionDetails,
  ForumService,
} from '@wm/web/data-access/forum';
import { CommentItem } from '@wm/web/data-access/shared';
import { CommentsSectionComponent, SeoService } from '@wm/web/web-shared';
import { ForumSidebarComponent } from '../../ui';
import { ForumPostComponent } from './forum-post/forum-post.component';

@Component({
  selector: 'wm-forum-page',
  imports: [
    DeskListComponent,
    ForumSidebarComponent,
    ForumPostComponent,
    CommentsSectionComponent,
    ErrorComponent,
  ],
  templateUrl: './forum-page.component.html',
  styleUrl: './forum-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPageComponent {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #forumService = inject(ForumService);
  readonly #authService = inject(AuthService);
  readonly #seoService = inject(SeoService);
  readonly #destroyRef = inject(DestroyRef);

  readonly discussionId = Number(this.#route.snapshot.paramMap.get('id'));
  readonly discussion = signal<ForumDiscussionDetails | null>(null);
  readonly comments = computed(() =>
    this.#toCommentItems(this.discussion()?.comments ?? []),
  );
  readonly categories = signal<
    Array<{
      id: number;
      slug: string;
      title: string;
      description: string | null;
      discussionsCount: number;
    }>
  >([]);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly isAuthorized = signal(this.#authService.isAuthorized$.value);
  readonly isUpdating = signal(false);

  constructor() {
    this.load();
    this.#forumService
      .categories()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((categories) => this.categories.set(categories));
    this.#authService.isAuthorized$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((value) => this.isAuthorized.set(value));
  }

  load() {
    if (!Number.isInteger(this.discussionId) || this.discussionId < 1) {
      this.isLoading.set(false);
      this.hasError.set(true);
      return;
    }
    this.isLoading.set(true);
    this.hasError.set(false);
    this.#forumService
      .discussion(this.discussionId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (discussion) => {
          this.discussion.set(discussion);
          this.#seoService.update(
            {
              title: discussion.title,
              description: discussion.post.slice(0, 160),
              index: true,
              canonicalPath: `/forum/${discussion.id}`,
              type: 'article',
            },
            `/forum/${discussion.id}`,
          );
        },
        error: () => this.hasError.set(true),
      });
  }

  toggleLike() {
    const discussion = this.discussion();
    if (!discussion) return;
    if (!this.isAuthorized()) {
      this.#router.navigate(['/login']).then();
      return;
    }
    if (this.isUpdating()) return;
    this.isUpdating.set(true);
    const request = discussion.isLiked
      ? this.#forumService.unlike(discussion.id)
      : this.#forumService.like(discussion.id);
    request
      .pipe(
        finalize(() => this.isUpdating.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((state) =>
        this.discussion.update((current) =>
          current
            ? {
                ...current,
                isLiked: state.isLiked,
                likesCount: state.likesCount,
              }
            : current,
        ),
      );
  }

  createComment(request: { comment: string; parentId?: number }) {
    if (!this.isAuthorized()) {
      this.#router.navigate(['/login']).then();
      return;
    }
    this.#forumService
      .createComment(this.discussionId, request)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.load());
  }

  newDiscussion() {
    this.#router.navigate(['/forum'], { queryParams: { create: true } }).then();
  }

  #toCommentItems(comments: ForumDiscussionDetails['comments']): CommentItem[] {
    return comments.map((comment) => ({
      id: comment.id,
      user: comment.author.nickname,
      text: comment.text,
      date: comment.createdAt,
      replies: this.#toCommentItems(comment.replies),
    }));
  }
}
