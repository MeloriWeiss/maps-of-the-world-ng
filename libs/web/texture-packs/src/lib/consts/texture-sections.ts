import type { TextureSectionDefinition } from '../interfaces/texture-section';

/** Подписи и виды текстур, отображаемые в галерее. */
export const textureSectionDefinitions: readonly TextureSectionDefinition[] = [
  {
    kind: 'SURFACE',
    title: 'Покрытия',
    description: 'Заполняют область карты повторяющимся узором.',
    moveLabel: 'Переместить в изображения',
    moveTo: 'STAMP',
  },
  {
    kind: 'STAMP',
    title: 'Изображения',
    description: 'Ставятся на карту целиком, по одному или кистью.',
    moveLabel: 'Переместить в покрытия',
    moveTo: 'SURFACE',
  },
];
