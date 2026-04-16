export interface GetSessionsDto {
  sessions: {
    id: number;
    userAgent: string | null;
    ip: string | null;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
  }[];
}
