import { SetMetadata } from '@nestjs/common';
import { UserRoleType } from '@wm/shared/users';

export const REQUIRED_ROLES = 'requiredRoles';

export const Roles = (...roles: UserRoleType[]) =>
  SetMetadata(REQUIRED_ROLES, roles);
