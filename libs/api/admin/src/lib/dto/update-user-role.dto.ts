import { IsIn } from 'class-validator';
import { UserRole, UserRoleType } from '@wm/shared/users';

/** Проверяет роль, назначаемую пользователю администратором. */
export class UpdateUserRoleDto {
  @IsIn([UserRole.user, UserRole.admin])
  role!: Exclude<UserRoleType, 'SUPER_ADMIN'>;
}
