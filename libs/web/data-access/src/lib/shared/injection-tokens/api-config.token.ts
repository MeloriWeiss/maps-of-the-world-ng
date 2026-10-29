import { InjectionToken } from '@angular/core';
import { ApiConfig } from '../interfaces/api-config.interface';

/** Токен внедрения конфигурации API. */
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
