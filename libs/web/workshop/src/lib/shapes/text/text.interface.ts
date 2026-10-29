import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

/** Текстовая фигура с координатами, содержимым и параметрами шрифта. */
export interface Text extends Shape, Point {
  text: string;
  fontSize: number;
  fontFamily: string;
  fillColor: string;
}

/** Данные текстовой фигуры для создания до назначения идентификатора и методов. */
export type TextCreateData = Omit<Text, keyof ShapeActions | 'id'>;
