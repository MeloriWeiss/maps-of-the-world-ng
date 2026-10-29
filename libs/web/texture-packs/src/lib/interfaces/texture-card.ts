import type { TextureItemView } from '@wm/web/data-access/texture-packs';

/** Данные карточки галереи с готовой подписью размера файла. */
export interface TextureCard extends TextureItemView {
  displaySize: string;
}
