import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForumListStore, GetDiscussionsDto } from '@wm/web/data-access/forum';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { SeoService } from '@wm/web/shared';
import {
  AvatarComponent,
  PaginationComponent,
  PaginationService,
} from '@wm/web/common-ui';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs';

/** Список тем форума с фильтрацией, сортировкой и пагинацией. */
@Component({
  selector: 'wm-forum-discussions-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    AvatarComponent,
    PaginationComponent,
  ],
  providers: [ForumListStore, PaginationService],
  templateUrl: './forum-discussions-list.component.html',
  styleUrl: './forum-discussions-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumDiscussionsListComponent {
  readonly store = inject(ForumListStore);
  readonly account = inject(CurrentAccountStore);
  readonly #pagination = inject(PaginationService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #seo = inject(SeoService);
  readonly search = new FormControl('', { nonNullable: true });
  readonly query = signal<GetDiscussionsDto>({ page: 1 });
  readonly sectionSlug = signal<string | null>(null);
  readonly listPath = computed(() =>
    this.sectionSlug() ? '/forum/sections/' + this.sectionSlug() : '/forum',
  );
  readonly selectedCategory = computed(() =>
    this.store.categories().find((item) => item.slug === this.query().category),
  );
  readonly sorts = [
    { id: 'active', label: 'Активные' },
    { id: 'new', label: 'Новые' },
    { id: 'unanswered', label: 'Без ответов' },
  ];
  constructor() {
    effect(() => {
      this.#pagination.currentPage.set(this.query().page);
      this.#pagination.maxPage.set(
        Math.max(this.query().page, this.store.pageCount()),
      );
    });
    effect(() => {
      const query = this.query();
      const section = this.selectedCategory();
      this.#seo.update(
        {
          title: section
            ? section.title + ' — форум'
            : 'Форум о картах, мирах и НРИ',
          description:
            section?.description ||
            'Обсуждайте игровые карты, создавайте миры и обменивайтесь опытом с ведущими настольных ролевых игр в GameMaster Helper.',
          index:
            !query.search &&
            !query.scope &&
            (!query.category || !!this.sectionSlug()) &&
            query.page === 1 &&
            query.sort === 'active' &&
            (!this.sectionSlug() || !!section),
          canonicalPath: query.category
            ? '/forum/sections/' + query.category
            : '/forum',
        },
        this.listPath(),
      );
    });
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        map(() => ({
          routeParams: this.#route.snapshot.paramMap,
          params: this.#route.snapshot.queryParamMap,
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.routeParams.get('slug') ===
              current.routeParams.get('slug') &&
            ['page', 'search', 'category', 'sort', 'scope', 'create'].every(
              (key) => previous.params.get(key) === current.params.get(key),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ routeParams, params }) => {
        this.sectionSlug.set(routeParams.get('slug'));
        if (params.has('create')) {
          void this.#router.navigate(['/forum/new'], {
            queryParams: { category: params.get('category') },
            replaceUrl: true,
          });
          return;
        }
        const sort = params.get('sort');
        const query: GetDiscussionsDto = {
          page: Math.max(1, Math.floor(Number(params.get('page')) || 1)),
          search: params.get('search')?.trim() || undefined,
          category: this.sectionSlug() || params.get('category') || undefined,
          sort: sort === 'new' || sort === 'unanswered' ? sort : 'active',
          scope: params.get('scope') === 'mine' ? 'mine' : undefined,
        };
        this.query.set(query);
        this.search.setValue(query.search ?? '', { emitEvent: false });
        if (query.scope === 'mine' && !this.account.user()) return;
        this.store.load(query);
      });
  }
  applySearch() {
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { search: this.search.value.trim() || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }
  retry() {
    this.store.load(this.query());
  }
}
