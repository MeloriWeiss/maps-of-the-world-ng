import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

export interface Text extends Shape, Point {
  text: string;
  fontSize: number;
  fontFamily: string;
  fillColor: string;
}

export type TextCreateData = Omit<Text, keyof ShapeActions | 'id'>;
