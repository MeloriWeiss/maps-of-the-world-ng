import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

export interface TextureStroke extends Shape {
  points: Point[];
  textureScale: number;
  textureRotation: number;
  textureColor: string;
}

export type TextureStrokeCreateData = Omit<
  TextureStroke,
  keyof ShapeActions | 'id'
>;
