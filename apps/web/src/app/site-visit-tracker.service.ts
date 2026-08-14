import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { API_CONFIG } from '@wm/web/data-access/shared';

const sessionKey = 'wm-site-visit-id';
const visitorKey = 'wm-site-visitor-id';

@Injectable({ providedIn: 'root' })
export class SiteVisitTrackerService {
  readonly #http = inject(HttpClient);
  readonly #apiConfig = inject(API_CONFIG);
  readonly #platformId = inject(PLATFORM_ID);

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
