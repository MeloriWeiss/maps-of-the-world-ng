import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  DeskListComponent,
  PaginationService,
  SearchInputComponent,
  SvgComponent,
} from '@wm/web/common-ui';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DiscussionCardComponent } from '@wm/web/common-ui';
import { debounceTime, finalize, shareReplay, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForumSidebarComponent } from '../../ui';
import { ForumService } from '@wm/web/data-access/forum';
import { AuthService } from '@wm/web/data-access/auth';

@Component({
  selector: 'wm-forum-discussions-list',
  imports: [
    AsyncPipe,
    DeskListComponent,
    DiscussionCardComponent,
    SearchInputComponent,
    SvgComponent,
    ReactiveFormsModule,
    ForumSidebarComponent,
  ],
  templateUrl: './forum-discussions-list.component.html',
  styleUrl: './forum-discussions-list.component.scss',
  providers: [PaginationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ForumDiscussionsListComponent {
  #activatedRoute = inject(ActivatedRoute);
  #router = inject(Router);
  #forumService = inject(ForumService);
  #authService = inject(AuthService);
  #paginationService = inject(PaginationService);

  searchControl = new FormControl('', { nonNullable: true });
  createForm = new FormGroup({
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
        Validators.maxLength(20_000),
      ],
    }),
  });
  showCreateForm = signal(false);
  isCreating = signal(false);
  createError = signal<string | null>(null);
  selectedCategory = signal<string | null>(null);
  categories$ = this.#forumService.categories().pipe(shareReplay(1));

  page$ = this.#activatedRoute.queryParamMap.pipe(
    switchMap((params) => {
      const page = Number(params.get('page')) || 1;
      const search = params.get('search')?.trim() || undefined;
      const category = params.get('category');
      if (params.has('create') && !this.showCreateForm()) this.openCreateForm();
      this.#paginationService.currentPage.set(page);
      this.selectedCategory.set(category);

      return this.#forumService
        .discussions({ page, search, category: category ?? undefined })
        .pipe(
          tap((result) =>
            this.#paginationService.maxPage.set(
              Math.max(1, Math.ceil(result.total / result.pageSize)),
            ),
          ),
        );
    }),
    shareReplay(1),
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe((value) => {
        this.#router
          .navigate([], {
            relativeTo: this.#activatedRoute,
            queryParams: {
              search: value ? value : undefined,
              page: 1,
            },
            queryParamsHandling: 'merge',
          })
          .then();
      });
  }

  openCreateForm() {
    if (!this.#authService.isAuthorized$.value) {
      this.#router.navigate(['/login']).then();
      return;
    }
    this.createForm.controls.category.setValue(this.selectedCategory() ?? '');
    this.showCreateForm.set(true);
  }

  cancelCreate() {
    this.showCreateForm.set(false);
    this.createError.set(null);
  }

  createDiscussion() {
    if (this.createForm.invalid || this.isCreating()) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.isCreating.set(true);
    this.createError.set(null);
    this.#forumService
      .createDiscussion(this.createForm.getRawValue())
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: ({ id }) => this.#router.navigate(['/forum', id]).then(),
        error: () => this.createError.set('Не удалось создать обсуждение.'),
      });
  }
}
