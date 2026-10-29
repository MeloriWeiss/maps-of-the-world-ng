import type { TextureItemView } from '@wm/web/data-access/texture-packs';
import type { TextureCard } from '../interfaces/texture-card';

/**
 * Подготавливает подпись размера для публичной галереи и редактора.
 * Использует десятичные КБ/МБ и округление, принятое в интерфейсе.
 */
export function toTextureCard(texture: TextureItemView): TextureCard {
  return {
    ...texture,
    displaySize:
      texture.size < 1_000_000
        ? `${Math.ceil(texture.size / 1_000)} КБ`
        : `${(texture.size / 1_000_000).toFixed(1)} МБ`,
  };
}
