export interface AccessPayload {
  userId: number;
}

export interface AccessRequest extends Request {
  user: AccessPayload;
}
