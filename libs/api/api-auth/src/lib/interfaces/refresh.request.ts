import { Request } from 'express';

export interface RefreshPayload {
  userId: number;
  accountId: number;
  sessionId: number;
}

export interface RefreshRequest extends Request {
  user: RefreshPayload;
}
