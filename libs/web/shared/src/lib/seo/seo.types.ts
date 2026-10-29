/** Тип страницы, используемый в метаданных Open Graph. */
export type SeoPageType = 'website' | 'article';

/** Метаданные страницы для заголовка, индексации и предпросмотра ссылки. */
export interface SeoMetadata {
  title: string;
  description: string;
  index: boolean;
  canonicalPath?: string;
  image?: string;
  type?: SeoPageType;
  structuredData?: Record<string, unknown>;
}

/** Базовые параметры сайта для формирования SEO-метаданных. */
export interface SeoConfig {
  siteName: string;
  siteUrl: string;
  defaultImage: string;
  locale: string;
}
