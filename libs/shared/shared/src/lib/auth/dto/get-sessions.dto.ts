/** Ответ API со списком активных сеансов аккаунта. */
export interface GetSessionsDto {
  sessions: {
    id: number;
    isCurrent?: boolean;
    userAgent: string | null;
    ip: string | null;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
  }[];
}
