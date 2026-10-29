/** Поля полезной нагрузки JWT-токена. */
export interface JwtTokenPayload {
  sub: number;
  accountId: number;
  sid?: number;
}
