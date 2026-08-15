import { UserRoleType } from '@wm/shared/users';

export interface AccessPayload {
  userId: number;
  profileId: number;
  role: UserRoleType;
}

export interface AccessRequest extends Request {
  user: AccessPayload;
}

export interface OptionalAccessRequest extends Request {
  user?: AccessPayload;
}
