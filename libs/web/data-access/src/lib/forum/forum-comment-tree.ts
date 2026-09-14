import { computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  concatMap,
  EMPTY,
  finalize,
  from,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
import { ForumService } from './forum.service';
import { ForumCommentsPage, ForumMessage } from './interfaces/discussion';

interface CommentBranch {
  items: ForumMessage[];
  expanded: boolean;
  loading: boolean;
  error: boolean;
  requestedPage: number;
  firstPage: number;
  lastPage: number;
  pageCount: number;
}

interface CommentRow {
  kind: 'message' | 'branch';
  key: string;
  message: ForumMessage;
  depth: number;
  indent: number;
  branch: CommentBranch | undefined;
}

/** Keeps the relationship tree independent of DOM depth and loads only opened branches. */
export class ForumCommentTree {
  readonly #api: ForumService;
  readonly #destroyRef: DestroyRef;
  readonly #reset = new Subject<void>();
  readonly #roots = signal<ForumMessage[]>([]);
  readonly #branches = signal(new Map<number, CommentBranch>());
  #discussionId = 0;

  readonly rows = computed(() => {
    const branches = this.#branches();
    const rows: CommentRow[] = [];
    const stack: Array<{
      kind: 'message' | 'branch';
      message: ForumMessage;
      depth: number;
    }> = this.#roots()
      .map<{
        kind: 'message' | 'branch';
        message: ForumMessage;
        depth: number;
      }>((message) => ({ kind: 'message', message, depth: 0 }))
      .reverse();
    const visited = new Set<number>();
    while (stack.length) {
      const entry = stack.pop();
      if (!entry) break;
      const { message, depth, kind } = entry;
      const branch = branches.get(message.id);
      if (kind === 'message') {
        if (visited.has(message.id)) continue;
        visited.add(message.id);
      }
      rows.push({
        kind,
        key: kind + message.id,
        message,
        depth,
        indent: Math.min(depth, 3),
        branch,
      });
      if (kind === 'branch' || !branch?.expanded) continue;
      stack.push({ kind: 'branch', message, depth });
      for (let index = branch.items.length - 1; index >= 0; index--) {
        stack.push({
          kind: 'message',
          message: branch.items[index],
          depth: depth + 1,
        });
      }
    }
    return rows;
  });

  constructor(api: ForumService, destroyRef: DestroyRef) {
    this.#api = api;
    this.#destroyRef = destroyRef;
  }

  clear() {
    this.#reset.next();
    this.#branches.set(new Map());
    this.#roots.set([]);
  }

  setRoots(discussionId: number, page: ForumCommentsPage) {
    this.clear();
    this.#discussionId = discussionId;
    this.#roots.set(page.items);
    from(page.path?.slice(1) ?? [])
      .pipe(
        concatMap((entry) =>
          entry.parentId ? this.#fetch(entry.parentId, entry.page) : EMPTY,
        ),
        catchError(() => EMPTY),
        takeUntil(this.#reset),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  toggle(parentId: number) {
    const branch = this.#branches().get(parentId);
    if (!branch) {
      this.load(parentId, 1);
      return;
    }
    this.#update(parentId, { ...branch, expanded: !branch.expanded });
  }

  load(parentId: number, page: number) {
    if (this.#branches().get(parentId)?.loading) return;
    this.#fetch(parentId, page)
      .pipe(
        catchError(() => EMPTY),
        takeUntil(this.#reset),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #fetch(parentId: number, page: number) {
    const previous = this.#branches().get(parentId);
    this.#update(parentId, {
      items: previous?.items ?? [],
      expanded: true,
      loading: true,
      error: false,
      requestedPage: page,
      firstPage: previous?.firstPage ?? page,
      lastPage: previous?.lastPage ?? page,
      pageCount: previous?.pageCount ?? 1,
    });
    return this.#api.commentBranch(this.#discussionId, page, parentId).pipe(
      tap({
        next: (result) => {
          const items = new Map(
            (previous?.items ?? []).map((item) => [item.id, item]),
          );
          for (const item of result.items) items.set(item.id, item);
          this.#update(parentId, {
            items: [...items.values()].sort((a, b) => a.id - b.id),
            expanded: this.#branches().get(parentId)?.expanded ?? true,
            loading: false,
            error: false,
            requestedPage: page,
            firstPage: Math.min(previous?.firstPage ?? page, page),
            lastPage: Math.max(previous?.lastPage ?? page, page),
            pageCount: Math.max(1, Math.ceil(result.total / result.pageSize)),
          });
        },
        error: () => {
          const current = this.#branches().get(parentId);
          if (current) this.#update(parentId, { ...current, error: true });
        },
      }),
      finalize(() => {
        const current = this.#branches().get(parentId);
        if (current) this.#update(parentId, { ...current, loading: false });
      }),
    );
  }

  #update(parentId: number, branch: CommentBranch) {
    this.#branches.update((current) => new Map(current).set(parentId, branch));
  }
}
