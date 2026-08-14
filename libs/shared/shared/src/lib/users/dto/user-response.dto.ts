import { UserRole, UserStatus } from '../models/user-access';

export interface UserResponseDto {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}
