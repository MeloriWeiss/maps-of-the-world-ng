import { IsIn } from 'class-validator';
import { UserStatus, UserStatusType } from '@wm/shared/users';

/** Проверяет статус, назначаемый пользовательскому аккаунту. */
export class UpdateUserStatusDto {
  @IsIn([UserStatus.active, UserStatus.blocked])
  status!: UserStatusType;
}
