import type { TextureKind } from '@wm/shared/workshop';
import type { TexturePageView } from '@wm/web/data-access/texture-packs';
import type { TextureCard } from '../interfaces/texture-card';
import type { TextureSectionView } from '../interfaces/texture-section';
import { textureSectionDefinitions } from '../consts/texture-sections';
import { toTextureCard } from './texture-card.mapper';

/** Собирает отображаемые секции галереи с состояниями пагинации и загрузки. */
export function toTextureSections(
  textures: Record<TextureKind, TextureCard[]>,
  totals: Record<TextureKind, number>,
  loadingMoreKind: TextureKind | null,
): TextureSectionView[] {
  return textureSectionDefinitions.map((definition) => {
    const items = textures[definition.kind];
    const total = totals[definition.kind];

    return {
      ...definition,
      items,
      total,
      hasMore: items.length < total,
      loadingMore: loadingMoreKind === definition.kind,
    };
  });
}

/** Создаёт начальное состояние галереи по первым страницам двух видов текстур. */
export function toTextureGallery(
  surfaces: TexturePageView,
  stamps: TexturePageView,
) {
  return {
    textures: {
      SURFACE: surfaces.items.map(toTextureCard),
      STAMP: stamps.items.map(toTextureCard),
    },
    totals: { SURFACE: surfaces.total, STAMP: stamps.total },
    total: surfaces.total + stamps.total,
    pages: { SURFACE: 1, STAMP: 1 },
  };
}
