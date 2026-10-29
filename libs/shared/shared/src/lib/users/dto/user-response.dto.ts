import { UserRole, UserStatus } from '../models/user-access';

/** Поля пользователя, включаемые в ответы API. */
export interface UserResponseDto {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}
