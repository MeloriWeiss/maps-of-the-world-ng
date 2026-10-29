import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, Subject, switchMap } from 'rxjs';
import { ForumService } from '../services/forum.service';
import {
  Discussion,
  ForumCategory,
  GetDiscussionsDto,
} from '../interfaces/discussion';

/** Хранит параметры списка тем и результаты его загрузки. */
@Injectable()
export class ForumListStore {
  readonly #api = inject(ForumService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #queries = new Subject<GetDiscussionsDto>();

  readonly items = signal<Discussion[]>([]);
  readonly categories = signal<ForumCategory[]>([]);
  readonly categoryError = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  constructor() {
    this.loadCategories();

    this.#queries
      .pipe(
        switchMap((query) => this.#loadDiscussions(query)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
      });
  }

  #loadDiscussions(query: GetDiscussionsDto) {
    this.loading.set(true);
    this.error.set('');

    return this.#api.discussions(query).pipe(
      catchError(() => {
        this.items.set([]);
        this.error.set('Не удалось загрузить темы. Попробуйте ещё раз.');

        return EMPTY;
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  /** Запускает загрузку тем с переданными фильтрами и страницей. */
  load(query: GetDiscussionsDto) {
    this.#queries.next(query);
  }

  /** Обновляет категории и состояние ошибки их загрузки. */
  loadCategories() {
    this.categoryError.set(false);
    this.#api
      .categories()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (items) => this.categories.set(items),
        error: () => this.categoryError.set(true),
      });
  }
}
