import { IsIn } from 'class-validator';
import { UserRole, UserRoleType } from '@wm/shared/users';

export class UpdateUserRoleDto {
  @IsIn([UserRole.user, UserRole.admin])
  role!: Exclude<UserRoleType, 'SUPER_ADMIN'>;
}
