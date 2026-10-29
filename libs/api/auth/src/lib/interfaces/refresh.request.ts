import { Request } from 'express';

/** Поля refresh-токена после проверки его подписи. */
export interface RefreshPayload {
  userId: number;
  accountId: number;
  sessionId: number;
}

/** HTTP-запрос с проверенными данными refresh-токена. */
export interface RefreshRequest extends Request {
  user: RefreshPayload;
}
