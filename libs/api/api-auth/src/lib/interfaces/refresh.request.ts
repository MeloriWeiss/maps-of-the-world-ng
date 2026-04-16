import { Request } from 'express';

export interface RefreshPayload {
  userId: number;
  sessionId: number;
}

export interface RefreshRequest extends Request {
  user: RefreshPayload;
}
