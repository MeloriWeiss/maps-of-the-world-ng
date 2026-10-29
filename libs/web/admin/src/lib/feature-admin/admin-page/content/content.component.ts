import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Renderer2,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ConfirmationModalComponent,
  ModalService,
  PaginationComponent,
  PaginationService,
  TabItem,
  TabsComponent,
  SelectComponent,
  SelectOptionComponent,
} from '@wm/web/common-ui';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize, Observable, tap } from 'rxjs';
import type {
  AdminDiscussionDto,
  AdminMapDto,
  AdminPageDto,
  AdminTexturePackDto,
  AdminContentPublication,
  AdminContentTab,
  AdminContentVisibility,
} from '@wm/web/data-access/admin';
import { AdminService, AdminModerationFacade } from '@wm/web/data-access/admin';
import {
  parseAdminContentTab,
  parseAdminContentVisibility,
  parseAdminContentPublication,
} from '@wm/web/data-access/admin/utils';

/** Предоставляет инструменты поиска и модерации пользовательского контента. */
@Component({
  selector: 'wm-admin-content',
  imports: [
    RouterLink,
    TabsComponent,
    PaginationComponent,
    ReactiveFormsModule,
    SelectComponent,
    SelectOptionComponent,
  ],
  templateUrl: './content.component.html',
  styleUrl: './content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PaginationService],
})
export class ContentComponent {
  readonly #adminService = inject(AdminService);
  readonly #moderation = inject(AdminModerationFacade);
  readonly #modalService = inject(ModalService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #r2 = inject(Renderer2);
  readonly #paginationService = inject(PaginationService);
  readonly #formBuilder = inject(NonNullableFormBuilder);
  #loadVersion = 0;
  readonly maps = signal<AdminMapDto[]>([]);
  readonly texturePacks = signal<AdminTexturePackDto[]>([]);
  readonly discussions = signal<AdminDiscussionDto[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly pendingMapId = signal<number | null>(null);
  readonly pendingTexturePackId = signal<string | null>(null);
  readonly pendingDiscussionId = signal<number | null>(null);
  readonly activeTab = signal<AdminContentTab>('maps');
  readonly filtersForm = this.#formBuilder.group({
    search: '',
    author: '',
    visibility: this.#formBuilder.control<AdminContentVisibility>(''),
    publication: this.#formBuilder.control<AdminContentPublication>(''),
    category: '',
  });
  readonly hasActiveItems = computed(() => {
    if (this.activeTab() === 'maps') return this.maps().length > 0;
    if (this.activeTab() === 'texture-packs') {
      return this.texturePacks().length > 0;
    }
    return this.discussions().length > 0;
  });
  readonly tabs: readonly TabItem[] = [
    { id: 'maps', label: 'Карты' },
    { id: 'texture-packs', label: 'Текстур-паки' },
    { id: 'discussions', label: 'Темы форума' },
  ];

  constructor() {
    this.#route.queryParamMap
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params) => {
        const page = Math.max(1, Number(params.get('page')) || 1);
        this.activeTab.set(parseAdminContentTab(params.get('tab')));
        this.filtersForm.setValue(
          {
            search: params.get('search') ?? '',
            author: params.get('author') ?? '',
            visibility: parseAdminContentVisibility(params.get('visibility')),
            publication: parseAdminContentPublication(
              params.get('publication'),
            ),
            category: params.get('category') ?? '',
          },
          { emitEvent: false },
        );
        this.#paginationService.currentPage.set(page);
        this.#loadActiveContent(page);
      });
  }

  toggleMap(item: AdminMapDto) {
    if (this.pendingMapId() !== null) return;

    this.actionError.set(null);
    this.pendingMapId.set(item.id);
    this.#r2.addClass(document.body, 'no-scroll');

    this.#moderation
      .setMapVisibility(
        this.#confirmVisibility(item.name, item.isHidden),
        item.id,
        !item.isHidden,
      )
      .pipe(
        finalize(() => this.pendingMapId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () =>
          this.maps.update((items) =>
            items.map((current) =>
              current.id === item.id
                ? { ...current, isHidden: !current.isHidden }
                : current,
            ),
          ),
        error: () =>
          this.actionError.set('Не удалось изменить видимость карты.'),
      });
  }

  selectTab(tabId: string) {
    const tab = parseAdminContentTab(tabId);
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: {
        tab: tab === 'maps' ? null : tab,
        page: 1,
        publication: null,
        category: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  applyFilters() {
    const filters = this.filtersForm.getRawValue();
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: {
        page: 1,
        search: filters.search.trim() || null,
        author: filters.author.trim() || null,
        visibility: filters.visibility || null,
        publication:
          this.activeTab() === 'discussions'
            ? null
            : filters.publication || null,
        category:
          this.activeTab() === 'discussions'
            ? filters.category.trim() || null
            : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  resetFilters() {
    this.filtersForm.reset();
    this.applyFilters();
  }

  selectVisibility(value: string) {
    this.filtersForm.controls.visibility.setValue(
      parseAdminContentVisibility(value),
    );
  }

  selectPublication(value: string) {
    this.filtersForm.controls.publication.setValue(
      parseAdminContentPublication(value),
    );
  }

  toggleTexturePack(item: AdminTexturePackDto) {
    if (this.pendingTexturePackId() !== null) return;

    this.actionError.set(null);
    this.pendingTexturePackId.set(item.id);
    this.#r2.addClass(document.body, 'no-scroll');

    this.#moderation
      .setTexturePackVisibility(
        this.#confirmVisibility(item.name, item.isHidden),
        item.id,
        !item.isHidden,
      )
      .pipe(
        finalize(() => this.pendingTexturePackId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () =>
          this.texturePacks.update((items) =>
            items.map((current) =>
              current.id === item.id
                ? { ...current, isHidden: !current.isHidden }
                : current,
            ),
          ),
        error: () =>
          this.actionError.set('Не удалось изменить видимость набора текстур.'),
      });
  }

  toggleDiscussion(item: AdminDiscussionDto) {
    if (this.pendingDiscussionId() !== null) return;

    this.actionError.set(null);
    this.pendingDiscussionId.set(item.id);
    this.#r2.addClass(document.body, 'no-scroll');

    this.#moderation
      .setDiscussionVisibility(
        this.#confirmVisibility(item.title, item.isHidden),
        item.id,
        !item.isHidden,
      )
      .pipe(
        finalize(() => this.pendingDiscussionId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () =>
          this.discussions.update((items) =>
            items.map((current) =>
              current.id === item.id
                ? { ...current, isHidden: !current.isHidden }
                : current,
            ),
          ),
        error: () =>
          this.actionError.set('Не удалось изменить видимость темы форума.'),
      });
  }

  #confirmVisibility(name: string, isHidden: boolean) {
    return this.#modalService
      .show<boolean>(ConfirmationModalComponent, {
        title: isHidden ? 'Вернуть материал?' : 'Скрыть материал?',
        subtitle: name,
        agreeBtnText: isHidden ? 'Вернуть' : 'Скрыть',
        rejectBtnText: 'Отмена',
      })
      .pipe(tap(() => this.#r2.removeClass(document.body, 'no-scroll')));
  }

  #loadActiveContent(page: number) {
    const loadVersion = ++this.#loadVersion;
    this.isLoading.set(true);
    this.loadError.set(null);
    this.#paginationService.maxPage.set(null);

    if (this.activeTab() === 'maps') {
      this.#loadPage(
        this.#adminService.getMaps(page, this.filtersForm.getRawValue()),
        this.maps,
        loadVersion,
      );
      return;
    }
    if (this.activeTab() === 'texture-packs') {
      this.#loadPage(
        this.#adminService.getTexturePacks(
          page,
          this.filtersForm.getRawValue(),
        ),
        this.texturePacks,
        loadVersion,
      );
      return;
    }
    this.#loadPage(
      this.#adminService.getDiscussions(page, this.filtersForm.getRawValue()),
      this.discussions,
      loadVersion,
    );
  }

  #loadPage<T>(
    request: Observable<AdminPageDto<T>>,
    items: WritableSignal<T[]>,
    loadVersion: number,
  ) {
    request
      .pipe(
        finalize(() => {
          if (loadVersion === this.#loadVersion) this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (loadVersion !== this.#loadVersion) return;

          items.set(result.items);
          this.#paginationService.currentPage.set(result.page);
          this.#paginationService.maxPage.set(
            Math.max(1, Math.ceil(result.total / result.pageSize)),
          );
        },
        error: () => {
          if (loadVersion !== this.#loadVersion) return;

          this.loadError.set('Не удалось загрузить контент.');
        },
      });
  }

  retryLoad() {
    this.#loadActiveContent(this.#paginationService.currentPage() ?? 1);
  }
}
