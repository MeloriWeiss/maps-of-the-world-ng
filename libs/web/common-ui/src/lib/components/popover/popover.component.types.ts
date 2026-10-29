/** Выравнивание всплывающего блока относительно элемента, который его открывает. */
export type PopoverAlignment = 'start' | 'center' | 'end';

/** Стандартное оформление блока или вариант без декоративной оболочки. */
export type PopoverAppearance = 'default' | 'bare';

/** Вычисленные координаты всплывающего блока. */
export interface PopoverPosition {
  x: number;
  y: number;
}
