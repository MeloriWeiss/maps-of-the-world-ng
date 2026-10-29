import { SetMetadata } from '@nestjs/common';
import { UserRoleType } from '@wm/shared/users';

/** Ключ метаданных ролей, необходимых для маршрута. */
export const REQUIRED_ROLES = 'requiredRoles';

/** Декоратор для задания ролей, которым разрешён доступ к обработчику. */
export const Roles = (...roles: UserRoleType[]) =>
  SetMetadata(REQUIRED_ROLES, roles);
