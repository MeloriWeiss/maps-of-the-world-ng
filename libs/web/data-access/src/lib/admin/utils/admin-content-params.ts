import type {
  AdminContentPublication,
  AdminContentTab,
  AdminContentVisibility,
} from '../interfaces';

/** Распознаёт вкладку материалов, используя карты по умолчанию. */
export function parseAdminContentTab(value: string | null): AdminContentTab {
  if (value === 'texture-packs' || value === 'discussions') return value;

  return 'maps';
}

/** Распознаёт фильтр видимости; неизвестное значение отключает фильтр. */
export function parseAdminContentVisibility(
  value: string | null,
): AdminContentVisibility {
  if (value === 'visible' || value === 'hidden') return value;

  return '';
}

/** Распознаёт фильтр публикации; неизвестное значение отключает фильтр. */
export function parseAdminContentPublication(
  value: string | null,
): AdminContentPublication {
  if (value === 'published' || value === 'draft') return value;

  return '';
}
