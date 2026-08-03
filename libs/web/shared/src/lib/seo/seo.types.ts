export type SeoPageType = 'website' | 'article';

export interface SeoMetadata {
  title: string;
  description: string;
  index: boolean;
  canonicalPath?: string;
  image?: string;
  type?: SeoPageType;
}

export interface SeoConfig {
  siteName: string;
  siteUrl: string;
  defaultImage: string;
  locale: string;
}
