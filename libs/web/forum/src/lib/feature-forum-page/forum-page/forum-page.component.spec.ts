import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { API_CONFIG } from '@wm/web/data-access/shared';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { SeoService } from '@wm/web/shared';
import { ForumPageComponent } from './forum-page.component';

describe('Discussion page', () => {
  it('renders the topic and retains typed text and error feedback after failed submission', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'forum/:id', component: ForumPageComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api/' } },
        {
          provide: CurrentAccountStore,
          useValue: {
            user: signal({ id: 1, role: 'USER' }),
            profile: signal({
              nickname: 'Автор',
              avatarUrl: '/own-avatar.png',
            }),
            avatarUrl: signal('/own-avatar.png'),
          },
        },
        { provide: SeoService, useValue: { update: jest.fn() } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/forum/3');
    http.expectOne('/api/forum-discussions/3?includeComments=false').flush({
      id: 3,
      title: 'Карта города',
      post: 'Обсудим новую карту города.',
      isClosed: false,
      isPinned: false,
      canEdit: true,
      author: { id: 1, nickname: 'Автор', avatarUrl: null },
      category: { slug: 'maps', title: 'Карты' },
      createdAt: '2026-09-13T10:00:00Z',
      updatedAt: '2026-09-13T10:00:00Z',
      likesCount: 0,
      commentsCount: 0,
    });
    http.expectOne('/api/forum-discussions/3/comments?view=tree&page=1').flush({
      items: [
        {
          id: 10,
          text: 'Первый вопрос',
          repliesCount: 1,
          isHidden: false,
          canEdit: false,
          parent: null,
          author: { id: 2, nickname: 'Участник', avatarUrl: null },
          createdAt: '2026-09-13T10:00:00Z',
          updatedAt: '2026-09-13T10:00:00Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('h1')).toHaveLength(1);
    expect(
      harness.routeNativeElement
        ?.querySelector('wm-avatar img')
        ?.getAttribute('src'),
    ).toBe('/own-avatar.png');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(
      'Карта города',
    );
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('.branch-toggle')
      ?.click();
    http
      .expectOne(
        '/api/forum-discussions/3/comments?view=tree&page=1&parentId=10',
      )
      .flush({
        items: [
          {
            id: 11,
            text: 'Уточнение',
            repliesCount: 0,
            isHidden: false,
            canEdit: false,
            parent: { id: 10, nickname: 'Участник' },
            author: { id: 2, nickname: 'Участник', avatarUrl: null },
            createdAt: '2026-09-13T10:00:00Z',
            updatedAt: '2026-09-13T10:00:00Z',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      });
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelectorAll('.message'),
    ).toHaveLength(2);
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('#comment-11 .text-button')
      ?.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelector('#comment-11')
        ?.nextElementSibling?.id,
    ).toBe('reply-form');
    expect(
      harness.routeNativeElement?.querySelectorAll('#reply-text'),
    ).toHaveLength(1);
    const textarea =
      harness.routeNativeElement?.querySelector<HTMLTextAreaElement>(
        '#reply-text',
      );
    if (!textarea) throw new Error('Reply form was not rendered');
    textarea.value = 'Давайте добавим реку';
    textarea.dispatchEvent(new Event('input'));
    harness.routeNativeElement
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )?.disabled,
    ).toBe(true);
    const request = http.expectOne('/api/forum-discussions/3/comments');
    expect(request.request.body.comment).toBe('Давайте добавим реку');
    expect(request.request.body.parentId).toBe(11);
    request.flush({}, { status: 500, statusText: 'Failure' });
    harness.detectChanges();
    expect(textarea.value).toBe('Давайте добавим реку');
    expect(
      harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent,
    ).toContain('Не удалось сохранить');
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )?.disabled,
    ).toBe(false);
    http.verify();
  });
});
