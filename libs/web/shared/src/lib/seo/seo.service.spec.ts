import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SEO_CONFIG } from './seo.token';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SeoService,
        {
          provide: SEO_CONFIG,
          useValue: {
            siteName: 'GameMaster Helper',
            siteUrl: 'https://gm-helper.ru/',
            defaultImage: '/assets/imgs/new-logo.png',
            locale: 'ru_RU',
          },
        },
      ],
    });
    service = TestBed.inject(SeoService);
    document = TestBed.inject(DOCUMENT);
  });

  it('updates title, metadata and canonical URL', () => {
    service.update(
      {
        title: 'Карты сообщества',
        description: 'Каталог карт сообщества.',
        index: true,
        canonicalPath: '/maps',
      },
      '/maps?page=2',
    );

    expect(document.title).toBe('Карты сообщества | GameMaster Helper');
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toBe('Каталог карт сообщества.');
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('index, follow');
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://gm-helper.ru/maps');
    expect(
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute('content'),
    ).toBe('https://gm-helper.ru/maps');
  });
});
