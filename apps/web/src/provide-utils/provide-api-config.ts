import { environment } from '../environments/environment';
import { Provider } from '@angular/core';
import { API_CONFIG } from '@wm/web/data-access/shared';

/** Создаёт провайдер конфигурации адреса API. */
export const provideApiConfig = (): Provider => {
  return {
    provide: API_CONFIG,
    useValue: {
      baseUrl: environment.apiUrl,
    },
  };
};
