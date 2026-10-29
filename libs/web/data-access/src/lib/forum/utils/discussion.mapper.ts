import type { Discussion, ForumDiscussionsPage } from '../interfaces';

/**
 * Преобразует серверное описание темы в модель существующей карточки форума.
 *
 * Сохраняет автора, аватар, категорию и состояние отметки текущего пользователя.
 * Переименование полей относится только к отображению и не изменяет ответ API.
 */
export function toDiscussion(
  item: ForumDiscussionsPage['items'][number],
): Discussion {
  return {
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
  };
}

/** Подготавливает карточки темы, сохраняя счётчики и текущую страницу выборки. */
export function toDiscussionPage(page: ForumDiscussionsPage) {
  return { ...page, items: page.items.map(toDiscussion) };
}
