import { IsIn } from 'class-validator';
import { UserStatus, UserStatusType } from '@wm/shared/users';

export class UpdateUserStatusDto {
  @IsIn([UserStatus.active, UserStatus.blocked])
  status!: UserStatusType;
}
