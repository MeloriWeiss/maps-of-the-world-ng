import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

/** Фигура линии с последовательностью точек. */
export interface Line extends Shape {
  points: Point[];
}

/** Данные линии для создания до назначения идентификатора и методов фигуры. */
export type LineCreateData = Omit<Line, keyof ShapeActions | 'id'>;
