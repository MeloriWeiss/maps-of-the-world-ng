import { Shape, ShapeActions } from '../shape';
import { Point } from '../../interfaces';

/** Фигура мазка с текстурой, параметрами поворота и точками траектории. */
export interface TextureStroke extends Shape {
  points: Point[];
  textureId: string | null;
  textureUrl: string | null;
  textureScale: number;
  textureRotation: number;
  textureColor: string;
}

/** Данные мазка для создания до назначения идентификатора и методов фигуры. */
export type TextureStrokeCreateData = Omit<
  TextureStroke,
  keyof ShapeActions | 'id'
>;
