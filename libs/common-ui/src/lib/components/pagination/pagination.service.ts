import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class PaginationService {
  #activatedRoute = inject(ActivatedRoute);
  #router = inject(Router);

  currentPage = signal<number | null>(null);
  maxPage = signal<number | null>(null);

  pagesList = computed(() => {
    const maxPage = this.maxPage();

    if (!maxPage) return;

    const result = [];
    for (let i = 1; i <= maxPage; i++) {
      result.push(i);
    }
    return result;
  });
  visiblePages = signal<Array<number | '...'>>([]);

  constructor() {
    effect(() => {
      const currentPage = this.currentPage();
      const maxPage = untracked(this.maxPage);
      const pagesList = untracked(this.pagesList);

      if (!currentPage || !maxPage || !pagesList) return;

      this.visiblePages.set(
        this.calculateVisiblePages(currentPage, maxPage, pagesList)
      );
    });
  }

  calculateVisiblePages(
    currentPage: number,
    maxPage: number,
    pagesList: number[]
  ): Array<number | '...'> {
    const dots = '...';

    if (maxPage < 5) {
      return pagesList;
    }
    if (currentPage === 1 || currentPage === 2) {
      return [1, 2, 3, dots, maxPage];
    }
    if (currentPage > 2) {
      if (currentPage === maxPage || currentPage === maxPage - 1) {
        return [1, dots, maxPage - 2, maxPage - 1, maxPage];
      }
      return [
        1,
        dots,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        dots,
        maxPage,
      ];
    }
    return [];
  }

  changePage(page: number) {
    const maxPage = this.maxPage();

    if (!maxPage || page < 1 || page > maxPage) {
      return;
    }

    this.#router
      .navigate([], {
        relativeTo: this.#activatedRoute,
        queryParams: {
          page: page,
        },
        queryParamsHandling: 'merge',
      })
      .then();
  }
}
