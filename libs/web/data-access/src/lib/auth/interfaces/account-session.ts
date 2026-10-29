import type { GetSessionsDto } from '@wm/shared/auth';

/** Данные активного сеанса аккаунта для интерфейса настроек. */
export type Session = GetSessionsDto['sessions'][number];
