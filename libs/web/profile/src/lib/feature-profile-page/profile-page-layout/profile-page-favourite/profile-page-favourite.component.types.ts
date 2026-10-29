/** Виды работ, которые можно показать в избранном. */
export type FavouriteFilter = 'all' | 'maps' | 'texture-packs';

/** Текст пустого состояния выбранного фильтра. */
export interface FavouriteEmptyState {
  readonly title: string;
  readonly description: string;
}
