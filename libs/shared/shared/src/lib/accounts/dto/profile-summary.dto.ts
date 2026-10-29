/** Краткие данные профиля для связанных разделов приложения. */
export interface ProfileSummaryDto {
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  likesReceived: number;
  publishedMapsCount: number;
  publishedTexturePacksCount: number;
}
