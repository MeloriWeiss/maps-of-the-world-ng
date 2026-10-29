import { parseDurationToMs } from '../../utils';
import { getFromEnv } from '@wm/api/shared';

/** Параметры подписи и срока действия JWT-токенов. */
export const jwtConfig = {
  accessToken: {
    name: 'access_token',
    path: '/api',
    expiresIn: parseDurationToMs(getFromEnv('JWT_ACCESS_EXPIRES', '15m')),
  },
  refreshToken: {
    name: 'refresh_token',
    path: '/api',
    expiresIn: parseDurationToMs(getFromEnv('JWT_REFRESH_EXPIRES', '30d')),
  },
};
