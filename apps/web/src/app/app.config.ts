import {
  ApplicationConfig,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { routes } from './consts/app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  HttpInterceptorFn,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { authInitializer, authInterceptor } from '@wm/web/auth';
import { provideApiConfig } from '../provide-utils/provide-api-config';
import { globalHttpErrorInterceptor } from '@wm/web/shared';
import { SEO_CONFIG, SeoService } from '@wm/web/shared';
import { TitleStrategy } from '@angular/router';
import { environment } from '../environments/environment';

/** Перечень HTTP-перехватчиков, подключаемых в приложении. */
export const appHttpInterceptors: HttpInterceptorFn[] = [
  globalHttpErrorInterceptor,
  authInterceptor,
];

/** Корневая конфигурация standalone-приложения. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        // Общую политику прокрутки применяет RouterScrollService.
        scrollPositionRestoration: 'disabled',
        anchorScrolling: 'disabled',
      }),
    ),
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
