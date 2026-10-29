import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { API_CONFIG } from '../../shared';

const sessionKey = 'wm-site-visit-id';
const visitorKey = 'wm-site-visitor-id';

/**
 * Регистрирует посещение сайта один раз в рамках браузерной сессии.
 *
 * Идентификатор посетителя сохраняется в localStorage, а отметка отправки —
 * в sessionStorage. При ошибке HTTP отметка удаляется, чтобы следующий вызов
 * мог повторить отправку. Вне браузера сервис не обращается к хранилищам.
 */
@Injectable({ providedIn: 'root' })
export class SiteVisitTrackerService {
  readonly #http = inject(HttpClient);
  readonly #apiConfig = inject(API_CONFIG);
  readonly #platformId = inject(PLATFORM_ID);

  /** Отправляет посещение, если текущая браузерная сессия ещё не зарегистрирована. */
  track() {
    if (!isPlatformBrowser(this.#platformId)) return;

    const existingSessionId = sessionStorage.getItem(sessionKey);
    if (existingSessionId) return;

    const sessionId = crypto.randomUUID();
    const visitorId =
      localStorage.getItem(visitorKey) ?? this.#createVisitorId();

    sessionStorage.setItem(sessionKey, sessionId);

    this.#http
      .post<void>(`${this.#apiConfig.baseUrl}site-visits`, {
        sessionId,
        visitorId,
      })
      .subscribe({ error: () => sessionStorage.removeItem(sessionKey) });
  }

  #createVisitorId() {
    const visitorId = crypto.randomUUID();
    localStorage.setItem(visitorKey, visitorId);

    return visitorId;
  }
}
