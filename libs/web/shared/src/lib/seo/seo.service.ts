import { DOCUMENT } from '@angular/common';
import { inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';
import { SEO_CONFIG } from './seo.token';
import { SeoMetadata } from './seo.types';

@Injectable()
export class SeoService extends TitleStrategy {
  readonly #title = inject(Title);
  readonly #meta = inject(Meta);
  readonly #document = inject(DOCUMENT);
  readonly #config = inject(SEO_CONFIG);
  readonly #renderer: Renderer2 = inject(RendererFactory2).createRenderer(
    null,
    null,
  );
  #canonicalLink: HTMLLinkElement | null = null;

  override updateTitle(snapshot: RouterStateSnapshot) {
    const metadata = this.#findMetadata(snapshot.root);

    if (!metadata) return;

    this.update(metadata, snapshot.url);
  }

  update(metadata: SeoMetadata, currentUrl: string) {
    const title = `${metadata.title} | ${this.#config.siteName}`;
    const canonicalUrl = this.#absoluteUrl(
      metadata.canonicalPath ?? this.#pathWithoutQuery(currentUrl),
    );
    const imageUrl = this.#absoluteUrl(
      metadata.image ?? this.#config.defaultImage,
    );

    this.#title.setTitle(title);
    this.#meta.updateTag({
      name: 'description',
      content: metadata.description,
    });
    this.#meta.updateTag({
      name: 'robots',
      content: metadata.index ? 'index, follow' : 'noindex, nofollow',
    });
    this.#meta.updateTag({ property: 'og:title', content: title });
    this.#meta.updateTag({
      property: 'og:description',
      content: metadata.description,
    });
    this.#meta.updateTag({
      property: 'og:type',
      content: metadata.type ?? 'website',
    });
    this.#meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.#meta.updateTag({ property: 'og:image', content: imageUrl });
    this.#meta.updateTag({
      property: 'og:site_name',
      content: this.#config.siteName,
    });
    this.#meta.updateTag({
      property: 'og:locale',
      content: this.#config.locale,
    });
    this.#meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.#meta.updateTag({ name: 'twitter:title', content: title });
    this.#meta.updateTag({
      name: 'twitter:description',
      content: metadata.description,
    });
    this.#meta.updateTag({ name: 'twitter:image', content: imageUrl });
    this.#setCanonical(canonicalUrl);
  }

  #findMetadata(route: ActivatedRouteSnapshot): SeoMetadata | null {
    let current: ActivatedRouteSnapshot | null = route;
    let metadata: SeoMetadata | null = null;

    while (current) {
      const candidate: unknown = current.data['seo'];

      if (this.#isSeoMetadata(candidate)) metadata = candidate;

      current = current.firstChild;
    }

    return metadata;
  }

  #isSeoMetadata(value: unknown): value is SeoMetadata {
    if (!value || typeof value !== 'object') return false;

    return (
      'title' in value &&
      typeof value.title === 'string' &&
      'description' in value &&
      typeof value.description === 'string' &&
      'index' in value &&
      typeof value.index === 'boolean'
    );
  }

  #setCanonical(url: string) {
    if (!this.#canonicalLink) {
      const link = this.#renderer.createElement('link') as HTMLLinkElement;
      this.#renderer.setAttribute(link, 'rel', 'canonical');
      this.#renderer.appendChild(this.#document.head, link);
      this.#canonicalLink = link;
    }

    this.#renderer.setAttribute(this.#canonicalLink, 'href', url);
  }

  #absoluteUrl(path: string) {
    return new URL(path, this.#config.siteUrl).toString();
  }

  #pathWithoutQuery(url: string) {
    return url.split(/[?#]/, 1)[0] || '/';
  }
}
