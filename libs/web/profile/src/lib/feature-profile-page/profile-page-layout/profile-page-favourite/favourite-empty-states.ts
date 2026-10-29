import type {
  FavouriteEmptyState,
  FavouriteFilter,
} from './profile-page-favourite.component.types';

/** Подписи пустого избранного для каждого фильтра списка. */
export const favouriteEmptyStates: Readonly<
  Record<FavouriteFilter, FavouriteEmptyState>
> = {
  all: {
    title: 'Понравившихся работ пока нет',
    description: 'Карты и текстур-паки, которые вы отметите, появятся здесь.',
  },
  maps: {
    title: 'Понравившихся карт пока нет',
    description: 'Карты, которые вы отметите, появятся в этом разделе.',
  },
  'texture-packs': {
    title: 'Понравившихся текстур-паков пока нет',
    description: 'Текстур-паки, которые вы отметите, появятся в этом разделе.',
  },
};
