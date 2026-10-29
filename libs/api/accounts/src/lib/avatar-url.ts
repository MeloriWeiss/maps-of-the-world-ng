/** Преобразует ключ аватара из хранилища в публичный версионируемый адрес аккаунта. */
export function avatarPublicUrl(userId: number, objectKey: string): string;
/** Формирует публичный адрес аватара по идентификатору аккаунта и ключу файла. */
export function avatarPublicUrl(
  userId: number,
  objectKey: string | null,
): string | null;
/** Формирует публичный адрес аватара по идентификатору аккаунта и ключу файла. */
export function avatarPublicUrl(userId: number, objectKey: string | null) {
  if (!objectKey) return null;
  if (objectKey.startsWith('https://') || objectKey.startsWith('http://')) {
    return objectKey;
  }
  return `/api/accounts/profiles/${userId}/avatar?v=${encodeURIComponent(objectKey)}`;
}
