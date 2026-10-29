/** Краткие данные темы для списков и карточек обсуждений. */
export interface Discussion {
  isPinned?: boolean;
  isClosed?: boolean;
  lastActivityAt?: string;
  authorId?: number;
  avatarUrl?: string | null;
  id: number;
  theme: string;
  author: string;
  createdAt: string;
  commentsCount: number;
  likes: number;
  isLiked: boolean;
  category: ForumCategorySummary;
}

/** Параметры фильтрации и постраничной загрузки тем форума. */
export interface GetDiscussionsDto {
  sort?: 'active' | 'new' | 'unanswered';
  scope?: 'mine';
  page: number;
  pageSize?: number;
  search?: string;
  category?: string;
}

/** Краткое представление категории форума в теме или сообщении. */
export interface ForumCategorySummary {
  slug: string;
  title: string;
}

/** Категория форума с идентификатором, описанием и счётчиком тем. */
export interface ForumCategory extends ForumCategorySummary {
  id: number;
  description: string | null;
  discussionsCount: number;
}

/** Данные автора сообщения, используемые в интерфейсе форума. */
export interface ForumAuthor {
  id: number;
  nickname: string;
  avatarUrl: string | null;
}

/** Комментарий с вложенными ответами для отображения дерева обсуждения. */
export interface ForumComment {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  replies: ForumComment[];
}

/** Полные данные темы, включая публикацию, автора и загруженные комментарии. */
export interface ForumDiscussionDetails {
  isPinned: boolean;
  isClosed: boolean;
  canEdit: boolean;
  lastActivityAt: string;
  id: number;
  title: string;
  post: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  category: ForumCategorySummary;
  author: ForumAuthor;
  comments: ForumComment[];
}

/** Страница кратких данных тем с общим количеством результатов. */
export interface ForumDiscussionsPage {
  items: Array<{
    isPinned: boolean;
    isClosed: boolean;
    lastActivityAt: string;
    id: number;
    title: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    category: ForumCategorySummary;
    author: ForumAuthor;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

/** Поля формы, передаваемые при создании темы форума. */
export interface CreateForumDiscussion {
  title: string;
  post: string;
  category: string;
}

/** Текст нового комментария и необязательный идентификатор родителя. */
export interface CreateForumComment {
  comment: string;
  parentId?: number;
}

/** Сообщение дерева комментариев с правами текущего пользователя. */
export interface ForumMessage {
  id: number;
  repliesCount?: number;
  text: string;
  isHidden: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  parent: { id: number; nickname: string } | null;
}

/** Страница сообщений с путём к ветке и параметрами пагинации. */
export interface ForumCommentsPage {
  path?: Array<{ id: number; parentId: number | null; page: number }>;
  items: ForumMessage[];
  page: number;
  pageSize: number;
  total: number;
}
