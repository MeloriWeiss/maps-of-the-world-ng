import {
  ApplicationConfig,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { authInitializer, authInterceptor } from '@wm/web/auth';
import { provideApiConfig } from '../provide-utils/provide-api-config';
import { globalHttpErrorInterceptor } from '@wm/web/web-shared';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, globalHttpErrorInterceptor]),
      withFetch(),
    ),
    provideAppInitializer(authInitializer),
    provideAnimations(),
    provideApiConfig(),
  ],
};
