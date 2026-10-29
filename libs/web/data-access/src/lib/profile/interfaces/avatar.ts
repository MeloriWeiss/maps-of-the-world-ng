/** URL аватара после успешной загрузки файла. */
export interface UploadedAvatarResponse {
  avatarUrl: string;
}

/** Подтверждение отсутствия аватара после удаления. */
export interface RemovedAvatarResponse {
  avatarUrl: null;
}
