import { ThemeEnum } from '../../common';

export interface UpdateAccountRequestDto {
  nickname?: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  phoneNumber?: string | null;
  birthDate?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  language?: string | null;
  theme?: ThemeEnum;
}
