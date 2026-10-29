import type { TextureKind } from '@wm/shared/workshop';
import type { TextureCard } from './texture-card';

/** Название и вид текстур, составляющие секцию галереи. */
export interface TextureSectionDefinition {
  kind: TextureKind;
  title: string;
  description: string;
  moveLabel: string;
  moveTo: TextureKind;
}

/** Секция галереи с элементами и состоянием постраничной загрузки. */
export interface TextureSectionView extends TextureSectionDefinition {
  items: TextureCard[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
}
