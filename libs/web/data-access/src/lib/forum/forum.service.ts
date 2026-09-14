import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_CONFIG } from '../shared';
import {
  CreateForumComment,
  CreateForumDiscussion,
  Discussion,
  ForumCategory,
  ForumDiscussionDetails,
  ForumDiscussionsPage,
  GetDiscussionsDto,
  ForumCommentsPage,
} from './interfaces/discussion';

@Injectable({ providedIn: 'root' })
export class ForumService {
  readonly #http = inject(HttpClient);
  readonly #apiConfig = inject(API_CONFIG);

  categories() {
    return this.#http.get<ForumCategory[]>(
      `${this.#apiConfig.baseUrl}forum-categories`,
    );
  }

  discussions(query: GetDiscussionsDto) {
    return this.#http
      .get<ForumDiscussionsPage>(
        `${this.#apiConfig.baseUrl}forum-discussions`,
        {
          params: {
            page: query.page,
            pageSize: query.pageSize ?? 20,
            ...(query.search ? { search: query.search } : {}),
            ...(query.category ? { category: query.category } : {}),
            ...(query.sort ? { sort: query.sort } : {}),
            ...(query.scope ? { scope: query.scope } : {}),
          },
        },
      )
      .pipe(
        map((page) => ({
          ...page,
          items: page.items.map(
            (item): Discussion => ({
              id: item.id,
              isPinned: item.isPinned,
              isClosed: item.isClosed,
              lastActivityAt: item.lastActivityAt,
              authorId: item.author.id,
              avatarUrl: item.author.avatarUrl,
              theme: item.title,
              author: item.author.nickname,
              createdAt: item.createdAt,
              commentsCount: item.commentsCount,
              likes: item.likesCount,
              isLiked: item.isLiked,
              category: item.category,
            }),
          ),
        })),
      );
  }

  discussion(id: number, includeComments = true) {
    return this.#http.get<ForumDiscussionDetails>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}`,
      { params: { includeComments } },
    );
  }

  comments(id: number, page: number, commentId?: number) {
    return this.#http.get<ForumCommentsPage>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}/comments`,
      {
        params: { page, ...(commentId ? { commentId } : {}) },
      },
    );
  }

  commentBranch(
    id: number,
    page: number,
    parentId?: number,
    commentId?: number,
  ) {
    return this.#http.get<ForumCommentsPage>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}/comments`,
      {
        params: {
          view: 'tree',
          page,
          ...(parentId ? { parentId } : {}),
          ...(commentId ? { commentId } : {}),
        },
      },
    );
  }

  editDiscussion(id: number, request: CreateForumDiscussion) {
    return this.#http.patch<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}`,
      request,
    );
  }

  editComment(id: number, commentId: number, comment: string) {
    return this.#http.patch<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}/comments/${commentId}`,
      { comment },
    );
  }

  moderateDiscussion(
    id: number,
    request: { isPinned?: boolean; isClosed?: boolean },
  ) {
    return this.#http.patch<{
      id: number;
      isPinned: boolean;
      isClosed: boolean;
    }>(
      `${this.#apiConfig.baseUrl}admin/forum-discussions/${id}/moderation`,
      request,
    );
  }

  moderateComment(id: number, commentId: number, isHidden: boolean) {
    return this.#http.patch<{ id: number; isHidden: boolean }>(
      `${this.#apiConfig.baseUrl}admin/forum-discussions/${id}/comments/${commentId}/visibility`,
      { isHidden },
    );
  }

  createDiscussion(request: CreateForumDiscussion) {
    return this.#http.post<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions`,
      request,
    );
  }

  createComment(discussionId: number, request: CreateForumComment) {
    return this.#http.post<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${discussionId}/comments`,
      request,
    );
  }

  like(discussionId: number) {
    return this.#http.post<{ isLiked: boolean; likesCount: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${discussionId}/likes`,
      {},
    );
  }

  unlike(discussionId: number) {
    return this.#http.delete<{ isLiked: boolean; likesCount: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${discussionId}/likes`,
    );
  }
}
