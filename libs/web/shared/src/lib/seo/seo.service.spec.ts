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

  it('reuses an existing canonical and removes stale structured data on navigation', () => {
    document.head
      .querySelectorAll(
        'link[rel="canonical"], script[type="application/ld+json"]',
      )
      .forEach((node) => node.remove());
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://gm-helper.ru/forum/3';
    document.head.appendChild(canonical);
    service.update(
      {
        title: 'Тема',
        description: 'Текст',
        index: true,
        structuredData: {
          '@type': 'DiscussionForumPosting',
          text: '</script>',
        },
      },
      '/forum/3',
    );
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(1);
    service.update(
      { title: 'Карты', description: 'Каталог', index: true },
      '/maps',
    );
    expect(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(0);
  });
});
