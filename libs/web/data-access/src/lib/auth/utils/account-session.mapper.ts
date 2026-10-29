import type { Session } from '../interfaces/account-session';
import { describeSessionDevice } from './session-device';

/**
 * Дополняет сессии подписями браузера и устройства и ставит текущую первой.
 *
 * Работает с новым массивом; порядок остальных сессий и исходные данные
 * сохраняются. Разбор user-agent служит только для отображения.
 */
export function toAccountSessionViews(sessions: readonly Session[]) {
  return sessions
    .map((session) => ({
      ...session,
      ...describeSessionDevice(session.userAgent),
    }))
    .sort((a, b) => Number(!!b.isCurrent) - Number(!!a.isCurrent));
}
