import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

/** Фигура прямоугольника с положением, размерами и цветом заливки. */
export interface Rectangle extends Shape, Point {
  width: number;
  height: number;
  fillColor: string;
}

/** Данные прямоугольника для создания до назначения идентификатора и методов. */
export type RectangleCreateData = Omit<Rectangle, keyof ShapeActions | 'id'>;
