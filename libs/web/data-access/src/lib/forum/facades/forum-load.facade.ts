import { inject, Injectable } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { ForumService } from '../services';

/**
 * Координирует составную загрузку страниц форума.
 * Состояние, обработка ошибок и время жизни подписок принадлежат stores.
 */
@Injectable({ providedIn: 'root' })
export class ForumLoadFacade {
  readonly #api = inject(ForumService);

  /** Загружает тему и страницу корневой ветки, сохраняя поиск сообщения по ссылке. */
  loadThread(id: number, page: number, commentId?: number) {
    return forkJoin({
      discussion: this.#api.discussion(id, false),
      comments: this.#api.commentBranch(id, page, undefined, commentId),
    });
  }

  /** Загружает категории и существующую тему; для новой темы возвращает null. */
  loadEditor(id: number | null) {
    return forkJoin({
      categories: this.#api.categories(),
      discussion: id ? this.#api.discussion(id, false) : of(null),
    });
  }
}
