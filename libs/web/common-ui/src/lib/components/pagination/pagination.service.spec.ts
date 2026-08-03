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
        { provide: Router, useValue: { navigate: jest.fn() } },
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
});
