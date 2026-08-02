export interface AccessPayload {
  userId: number;
  profileId: number;
}

export interface AccessRequest extends Request {
  user: AccessPayload;
}

export interface OptionalAccessRequest extends Request {
  user?: AccessPayload;
}
