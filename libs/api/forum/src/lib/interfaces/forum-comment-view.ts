/** Данные комментария форума с полями, подготовленными для ответа API. */
export interface ForumCommentView {
  id: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    nickname: string;
    avatarUrl: string | null;
  };
  replies: ForumCommentView[];
}
