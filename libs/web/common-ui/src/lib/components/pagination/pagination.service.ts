import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable()
export class PaginationService {
  #activatedRoute = inject(ActivatedRoute);
  #router = inject(Router);

  currentPage = signal<number | null>(null);
  maxPage = signal<number | null>(null);
  readonly pageQueryParams = signal<
    Record<string, string | number | boolean | null>
  >({});

  pagesList = computed(() => {
    const maxPage = this.maxPage();

    if (!maxPage) return [];

    const result = [];
    for (let i = 1; i <= maxPage; i++) {
      result.push(i);
    }
    return result;
  });
  visiblePages = computed<Array<number | '...'>>(() => {
    const currentPage = this.currentPage();
    const maxPage = this.maxPage();

    if (!currentPage || !maxPage) return [];

    // The visible window needs at most seven entries, regardless of total size.
    return this.calculateVisiblePages(
      currentPage,
      maxPage,
      maxPage < 5 ? this.pagesList() : [],
    );
  });

  calculateVisiblePages(
    currentPage: number,
    maxPage: number,
    pagesList: number[],
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
          ...this.pageQueryParams(),
          page: page,
        },
        queryParamsHandling: 'merge',
      })
      .then();
  }
}
