import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

export interface Rectangle extends Shape, Point {
  width: number;
  height: number;
  fillColor: string;
}

export type RectangleCreateData = Omit<Rectangle, keyof ShapeActions>;
