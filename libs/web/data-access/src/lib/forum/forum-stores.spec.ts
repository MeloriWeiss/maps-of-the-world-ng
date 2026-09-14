import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { API_CONFIG } from '../shared';
import { CurrentAccountStore } from '../profile';
import { ForumThreadStore } from './forum-thread.store';
import { ForumEditorStore } from './forum-editor.store';
import { ForumDiscussionDetails } from './interfaces/discussion';

describe('Forum HTTP stores', () => {
  let http: HttpTestingController;
  const details: ForumDiscussionDetails = {
    id: 3,
    title: 'Мир',
    post: 'Описание мира',
    isClosed: false,
    isPinned: false,
    canEdit: true,
    createdAt: '2026-09-13T10:00:00Z',
    updatedAt: '2026-09-13T10:00:00Z',
    lastActivityAt: '2026-09-13T10:00:00Z',
    commentsCount: 0,
    likesCount: 0,
    isLiked: false,
    author: { id: 1, nickname: 'Мастер', avatarUrl: null },
    category: { slug: 'maps', title: 'Карты' },
    comments: [],
  };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ForumThreadStore,
        ForumEditorStore,
        { provide: API_CONFIG, useValue: { baseUrl: '/api/' } },
        {
          provide: CurrentAccountStore,
          useValue: { user: signal({ id: 1, role: 'USER' }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const loadThread = (store: ForumThreadStore) => {
    store.load(3, 1);
    http
      .expectOne('/api/forum-discussions/3?includeComments=false')
      .flush(details);
    http
      .expectOne('/api/forum-discussions/3/comments?view=tree&page=1')
      .flush({ items: [], total: 0, page: 1, pageSize: 20 });
  };

  it('prevents duplicate sends and retains reply context after an HTTP failure', () => {
    const store = TestBed.inject(ForumThreadStore);
    loadThread(store);
    const target = {
      id: 10,
      text: 'Вопрос',
      isHidden: false,
      canEdit: false,
      createdAt: '',
      updatedAt: '',
      author: details.author,
      parent: null,
    };
    store.replyTo.set(target);
    const success = jest.fn();
    store.publish('Ответ', success);
    store.publish('Ответ', success);
    const request = http.expectOne('/api/forum-discussions/3/comments');
    expect(request.request.body).toEqual({ comment: 'Ответ', parentId: 10 });
    request.flush({}, { status: 500, statusText: 'Failure' });
    expect(store.pending()).toBe(false);
    expect(store.replyTo()).toEqual(target);
    expect(store.actionError()).not.toBe('');
    expect(success).not.toHaveBeenCalled();
    store.publish('Ответ', success);
    http.expectOne('/api/forum-discussions/3/comments').flush({ id: 11 });
    expect(store.replyTo()).toBeNull();
    expect(success).toHaveBeenCalledWith(11);
  });

  it('cancels obsolete topic requests when navigation changes', () => {
    const store = TestBed.inject(ForumThreadStore);
    store.load(3, 1);
    const stale = http.expectOne(
      '/api/forum-discussions/3?includeComments=false',
    );
    const staleComments = http.expectOne(
      '/api/forum-discussions/3/comments?view=tree&page=1',
    );
    store.load(4, 1);
    expect(stale.cancelled).toBe(true);
    expect(staleComments.cancelled).toBe(true);
    http
      .expectOne('/api/forum-discussions/4?includeComments=false')
      .flush({ ...details, id: 4 });
    http
      .expectOne('/api/forum-discussions/4/comments?view=tree&page=1')
      .flush({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(store.discussion()?.id).toBe(4);
    expect(store.loading()).toBe(false);
  });

  // it('keeps editor text and draft after failure, clearing the draft only on success', () => {
  //   const store = TestBed.inject(ForumEditorStore);
  //   store.load(null, 'maps');
  //   http.expectOne('/api/forum-categories').flush([
  //     {
  //       id: 1,
  //       slug: 'maps',
  //       title: 'Карты',
  //       description: '',
  //       discussionsCount: 0,
  //     },
  //   ]);
  //   store.form.setValue({
  //     title: 'Новый мир',
  //     post: 'Описание нового мира.',
  //     category: 'maps',
  //   });
  //   const success = jest.fn();
  //   store.save(success);
  //   http
  //     .expectOne('/api/forum-discussions')
  //     .flush({}, { status: 500, statusText: 'Failure' });
  //   expect(store.form.controls.post.value).toBe('Описание нового мира.');
  //   expect(store.dirty()).toBe(true);
  //   expect(localStorage.getItem('gmhelper.forum-draft.1.new')).toContain(
  //     'Описание нового мира.',
  //   );
  //   store.save(success);
  //   http.expectOne('/api/forum-discussions').flush({ id: 3 });
  //   expect(localStorage.getItem('gmhelper.forum-draft.1.new')).toBeNull();
  //   expect(store.dirty()).toBe(false);
  //   expect(success).toHaveBeenCalledWith(3);
  // });
  //
  // it('restores a draft only for the current author and topic', () => {
  //   localStorage.setItem(
  //     'gmhelper.forum-draft.1.new',
  //     JSON.stringify({
  //       title: 'Черновик',
  //       post: 'Текст из черновика',
  //       category: 'maps',
  //     }),
  //   );
  //   const store = TestBed.inject(ForumEditorStore);
  //   store.load(null, '');
  //   http
  //     .expectOne('/api/forum-categories')
  //     .flush([{ id: 1, slug: 'maps', title: 'Карты' }]);
  //   expect(store.form.controls.title.value).toBe('Черновик');
  //   expect(store.dirty()).toBe(true);
  // });
});
