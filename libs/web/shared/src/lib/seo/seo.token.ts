import { InjectionToken } from '@angular/core';
import { SeoConfig } from './seo.types';

/** Токен внедрения базовой конфигурации SEO. */
export const SEO_CONFIG = new InjectionToken<SeoConfig>('SEO_CONFIG');
