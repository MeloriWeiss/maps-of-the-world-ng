export interface AccountResponseDto {
  nickname: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  phoneNumber?: string | null;
  birthDate?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
