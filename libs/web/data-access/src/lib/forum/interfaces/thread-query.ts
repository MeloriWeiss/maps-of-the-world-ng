/** Параметры загрузки темы и её комментариев. */
export interface ForumThreadQuery {
  id: number;
  page: number;
  commentId?: number;
}
