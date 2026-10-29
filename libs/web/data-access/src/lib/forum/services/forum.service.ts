import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_CONFIG } from '../../shared';
import {
  CreateForumComment,
  CreateForumDiscussion,
  ForumCategory,
  ForumDiscussionDetails,
  ForumDiscussionsPage,
  GetDiscussionsDto,
  ForumCommentsPage,
} from '../interfaces/discussion';
import type {
  ForumModerationRequest,
  ForumModerationState,
} from '../interfaces';
import { toDiscussionPage } from '../utils/discussion.mapper';

/** Выполняет запросы к темам, комментариям и категориям форума. */
@Injectable({ providedIn: 'root' })
export class ForumService {
  readonly #http = inject(HttpClient);
  readonly #apiConfig = inject(API_CONFIG);

  /** Загружает категории, доступные для создания и фильтрации тем. */
  categories() {
    return this.#http.get<ForumCategory[]>(
      `${this.#apiConfig.baseUrl}forum-categories`,
    );
  }

  /** Загружает страницу тем с применёнными фильтрами и сортировкой. */
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
      .pipe(map(toDiscussionPage));
  }

  /** Загружает тему и по запросу включает первую страницу комментариев. */
  discussion(id: number, includeComments = true) {
    return this.#http.get<ForumDiscussionDetails>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}`,
      { params: { includeComments } },
    );
  }

  /** Загружает плоскую страницу комментариев выбранной темы. */
  comments(id: number, page: number, commentId?: number) {
    return this.#http.get<ForumCommentsPage>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}/comments`,
      {
        params: { page, ...(commentId ? { commentId } : {}) },
      },
    );
  }

  /** Загружает ветку ответов с постраничной навигацией. */
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

  /** Сохраняет отредактированные заголовок, публикацию и категорию темы. */
  editDiscussion(id: number, request: CreateForumDiscussion) {
    return this.#http.patch<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}`,
      request,
    );
  }

  /** Сохраняет изменённый текст комментария. */
  editComment(id: number, commentId: number, comment: string) {
    return this.#http.patch<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${id}/comments/${commentId}`,
      { comment },
    );
  }

  /** Передаёт изменения состояния темы в API модерации. */
  moderateDiscussion(id: number, request: ForumModerationRequest) {
    return this.#http.patch<ForumModerationState>(
      `${this.#apiConfig.baseUrl}admin/forum-discussions/${id}/moderation`,
      request,
    );
  }

  /** Изменяет видимость комментария через API модерации. */
  moderateComment(id: number, commentId: number, isHidden: boolean) {
    return this.#http.patch<{ id: number; isHidden: boolean }>(
      `${this.#apiConfig.baseUrl}admin/forum-discussions/${id}/comments/${commentId}/visibility`,
      { isHidden },
    );
  }

  /** Создаёт тему форума из проверенных полей формы. */
  createDiscussion(request: CreateForumDiscussion) {
    return this.#http.post<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions`,
      request,
    );
  }

  /** Добавляет комментарий или ответ к теме. */
  createComment(discussionId: number, request: CreateForumComment) {
    return this.#http.post<{ id: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${discussionId}/comments`,
      request,
    );
  }

  /** Ставит отметку текущего пользователя теме. */
  like(discussionId: number) {
    return this.#http.post<{ isLiked: boolean; likesCount: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${discussionId}/likes`,
      {},
    );
  }

  /** Убирает отметку текущего пользователя с темы. */
  unlike(discussionId: number) {
    return this.#http.delete<{ isLiked: boolean; likesCount: number }>(
      `${this.#apiConfig.baseUrl}forum-discussions/${discussionId}/likes`,
    );
  }
}
