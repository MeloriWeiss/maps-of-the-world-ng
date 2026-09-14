import { DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { API_CONFIG } from '../shared';
import { ForumService } from './forum.service';
import { ForumCommentTree } from './forum-comment-tree';
import { ForumMessage } from './interfaces/discussion';

describe('Lazy comment tree', () => {
  let http: HttpTestingController;
  let tree: ForumCommentTree;
  const message = (id: number, parentId?: number): ForumMessage => ({
    id,
    parent: parentId ? { id: parentId, nickname: 'Автор' } : null,
    repliesCount: 1,
    text: 'Ответ',
    isHidden: false,
    canEdit: true,
    author: { id: 1, nickname: 'Автор', avatarUrl: null },
    createdAt: '',
    updatedAt: '',
  });
  const flush = (
    parentId: number,
    items: ForumMessage[],
    page = 1,
    total = items.length,
  ) => {
    http
      .expectOne(
        `/api/forum-discussions/3/comments?view=tree&page=${page}&parentId=${parentId}`,
      )
      .flush({ items, page, total, pageSize: 20 });
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api/' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    tree = TestBed.runInInjectionContext(
      () => new ForumCommentTree(inject(ForumService), inject(DestroyRef)),
    );
    tree.setRoots(3, { items: [message(1)], page: 1, pageSize: 20, total: 1 });
  });
  afterEach(() => http.verify());

  it('loads only expanded branches, retries failed pages and preserves cached replies', () => {
    expect(tree.rows().map((row) => row.message.id)).toEqual([1]);
    tree.toggle(1);
    flush(1, [message(2, 1)], 1, 21);
    tree.load(1, 2);
    http
      .expectOne(
        '/api/forum-discussions/3/comments?view=tree&page=2&parentId=1',
      )
      .flush({}, { status: 500, statusText: 'Failure' });
    expect(tree.rows()[0].branch?.error).toBe(true);
    expect(tree.rows()[0].branch?.items).toHaveLength(1);
    tree.load(1, 2);
    flush(1, [message(3, 1)], 2, 21);
    expect(
      tree
        .rows()
        .filter((row) => row.kind === 'message')
        .map((row) => row.message.id),
    ).toEqual([1, 2, 3]);
    tree.toggle(1);
    expect(tree.rows()).toHaveLength(1);
    tree.toggle(1);
    expect(tree.rows().filter((row) => row.kind === 'message')).toHaveLength(3);
    http.expectNone((request) => request.url.includes('/comments'));
  });

  it('keeps arbitrary relationship depth with bounded visual indentation', () => {
    for (let id = 1; id <= 30; id++) {
      tree.toggle(id);
      flush(id, [message(id + 1, id)]);
    }
    const rows = tree.rows().filter((row) => row.kind === 'message');
    expect(rows).toHaveLength(31);
    expect(rows[30].depth).toBe(30);
    expect(rows[30].indent).toBe(3);
    tree.toggle(1);
    expect(tree.rows()).toHaveLength(1);
  });

  it('reveals a permalink path and allows earlier siblings to be loaded', () => {
    tree.setRoots(3, {
      items: [message(1)],
      page: 2,
      pageSize: 20,
      total: 21,
      path: [
        { id: 1, parentId: null, page: 2 },
        { id: 22, parentId: 1, page: 2 },
        { id: 23, parentId: 22, page: 1 },
      ],
    });
    flush(1, [message(22, 1)], 2, 21);
    flush(22, [message(23, 22)]);
    expect(
      tree
        .rows()
        .filter((row) => row.kind === 'message')
        .map((row) => row.message.id),
    ).toEqual([1, 22, 23]);
    expect(tree.rows()[0].branch?.firstPage).toBe(2);
    tree.load(1, 1);
    flush(1, [message(2, 1)], 1, 21);
    expect(tree.rows()[0].branch?.firstPage).toBe(1);
    expect(
      tree
        .rows()
        .filter((row) => row.kind === 'message')
        .map((row) => row.message.id),
    ).toEqual([1, 2, 22, 23]);
  });

  it('cancels pending branch requests when the topic changes', () => {
    tree.toggle(1);
    const request = http.expectOne(
      '/api/forum-discussions/3/comments?view=tree&page=1&parentId=1',
    );
    tree.clear();
    expect(request.cancelled).toBe(true);
    expect(tree.rows()).toHaveLength(0);
  });
});
