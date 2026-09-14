import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { PaginationService } from './pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PaginationService,
        { provide: ActivatedRoute, useValue: {} },
        {
          provide: Router,
          useValue: { navigate: jest.fn().mockResolvedValue(true) },
        },
      ],
    });
    service = TestBed.inject(PaginationService);
  });

  it('updates visible pages when max page arrives after current page', () => {
    service.currentPage.set(1);

    expect(service.visiblePages()).toEqual([]);

    service.maxPage.set(3);

    expect(service.visiblePages()).toEqual([1, 2, 3]);
  });

  it('uses ellipses for a long page range', () => {
    service.currentPage.set(5);
    service.maxPage.set(10);

    expect(service.visiblePages()).toEqual([1, '...', 4, 5, 6, '...', 10]);
  });

  it('does not allocate every page for a large result set', () => {
    service.currentPage.set(500);
    service.maxPage.set(1_000_000);
    const pages = jest.spyOn(service, 'pagesList');
    expect(service.visiblePages()).toEqual([
      1,
      '...',
      499,
      500,
      501,
      '...',
      1_000_000,
    ]);
    expect(pages).not.toHaveBeenCalled();
  });

  it('clears a permalink target while preserving other query parameters', () => {
    service.maxPage.set(5);
    service.pageQueryParams.set({ comment: null });
    service.changePage(2);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { comment: null, page: 2 },
      queryParamsHandling: 'merge',
    });
  });
});
