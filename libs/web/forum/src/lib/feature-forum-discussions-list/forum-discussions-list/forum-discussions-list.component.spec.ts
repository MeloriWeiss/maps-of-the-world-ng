import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_CONFIG } from '@wm/web/data-access/shared';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { SeoService } from '@wm/web/shared';
import { ForumDiscussionsListComponent } from './forum-discussions-list.component';

describe('Forum search navigation', () => {
  it('clears search and pagination while preserving the section and sorting', async () => {
    const updateSeo = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'forum/sections/:slug',
            component: ForumDiscussionsListComponent,
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api/' } },
        { provide: CurrentAccountStore, useValue: { user: signal(null) } },
        { provide: SeoService, useValue: { update: updateSeo } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create(
      '/forum/sections/maps?search=castle&sort=new&page=2',
    );
    http.expectOne('/api/forum-categories').flush([
      {
        id: 1,
        slug: 'maps',
        title: 'Карты',
        description: 'Обсуждение карт',
        discussionsCount: 4,
      },
    ]);
    http
      .expectOne((request) => request.url === '/api/forum-discussions')
      .flush({
        items: [],
        total: 0,
        page: 2,
        pageSize: 20,
      });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('h1')).toHaveLength(1);
    expect(updateSeo).toHaveBeenLastCalledWith(
      expect.objectContaining({
        index: false,
        canonicalPath: '/forum/sections/maps',
      }),
      '/forum/sections/maps',
    );
    const reset =
      harness.routeNativeElement?.querySelector<HTMLAnchorElement>(
        '.search-summary a',
      );
    if (!reset) throw new Error('Search reset link is missing');
    reset.click();
    await harness.fixture.whenStable();
    const request = http.expectOne(
      (item) => item.url === '/api/forum-discussions',
    );
    expect(request.request.params.get('category')).toBe('maps');
    expect(request.request.params.get('sort')).toBe('new');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.has('search')).toBe(false);
    request.flush({ items: [], total: 0, page: 1, pageSize: 20 });
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe(
      '/forum/sections/maps?sort=new&page=1',
    );
    expect(
      harness.routeNativeElement?.querySelector('.search-summary'),
    ).toBeNull();
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>(
        '#forum-search',
      )?.value,
    ).toBe('');
    http.verify();
  });
});
