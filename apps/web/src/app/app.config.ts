import {
  ApplicationConfig,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  HttpInterceptorFn,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { authInitializer, authInterceptor } from '@wm/web/auth';
import { provideApiConfig } from '../provide-utils/provide-api-config';
import { globalHttpErrorInterceptor } from '@wm/web/web-shared';
import { SEO_CONFIG, SeoService } from '@wm/web/web-shared';
import { TitleStrategy } from '@angular/router';
import { environment } from '../environments/environment';

export const appHttpInterceptors: HttpInterceptorFn[] = [
  globalHttpErrorInterceptor,
  authInterceptor,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors(appHttpInterceptors), withFetch()),
    provideAppInitializer(authInitializer),
    provideAnimations(),
    provideApiConfig(),
    {
      provide: SEO_CONFIG,
      useValue: {
        siteName: 'GameMaster Helper',
        siteUrl: environment.siteUrl,
        defaultImage: '/assets/imgs/new-logo.png',
        locale: 'ru_RU',
      },
    },
    SeoService,
    { provide: TitleStrategy, useExisting: SeoService },
  ],
};
