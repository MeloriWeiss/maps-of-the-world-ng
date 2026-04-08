import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

export interface Line extends Shape {
  points: Point[];
}

export type LineCreateData = Omit<Line, keyof ShapeActions>;
