import type { ProfileSummaryDto } from '@wm/shared/accounts';
import type { UserResponseDto } from '@wm/shared/users';

/** Состояние текущего аккаунта и загрузки сводки его профиля. */
export interface CurrentAccountState {
  user: UserResponseDto | null;
  profile: ProfileSummaryDto | null;
  isProfileLoading: boolean;
}
