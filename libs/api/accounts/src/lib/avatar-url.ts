/** Converts a stored avatar key to the public, versioned account endpoint. */
export function avatarPublicUrl(userId: number, objectKey: string): string;
export function avatarPublicUrl(
  userId: number,
  objectKey: string | null,
): string | null;
export function avatarPublicUrl(userId: number, objectKey: string | null) {
  if (!objectKey) return null;
  if (objectKey.startsWith('https://') || objectKey.startsWith('http://')) {
    return objectKey;
  }
  return `/api/accounts/profiles/${userId}/avatar?v=${encodeURIComponent(objectKey)}`;
}
