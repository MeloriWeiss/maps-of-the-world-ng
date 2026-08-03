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
          },
        },
      )
      .pipe(
        map((page) => ({
          ...page,
          items: page.items.map(
            (item): Discussion => ({
              id: item.id,
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

  discussion(id: number) {
    return this.#http.get<ForumDiscussionDetails>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}`,
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
