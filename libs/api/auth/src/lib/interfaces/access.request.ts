import { Request } from 'express';
import { UserRoleType } from '@wm/shared/users';

/** Поля access-токена, доступные после проверки авторизации. */
export interface AccessPayload {
  userId: number;
  profileId: number;
  role: UserRoleType;
}

/** HTTP-запрос с обязательными данными аутентифицированного пользователя. */
export interface AccessRequest extends Request {
  user: AccessPayload;
}

/** HTTP-запрос с необязательными данными аутентификации пользователя. */
export interface OptionalAccessRequest extends Request {
  user?: AccessPayload;
}
