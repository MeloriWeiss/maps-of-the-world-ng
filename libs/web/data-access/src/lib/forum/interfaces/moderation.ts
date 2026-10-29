/** Запрос на изменение состояния модерации темы или комментария. */
export interface ForumModerationRequest {
  isPinned?: boolean;
  isClosed?: boolean;
}

/** Состояние модерации, возвращаемое сервером. */
export interface ForumModerationState {
  id: number;
  isPinned: boolean;
  isClosed: boolean;
}
