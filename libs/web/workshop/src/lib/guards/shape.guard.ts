import { ShapesTypes } from '../consts';
import { ShapesData } from '../interfaces';
import { RectangleCreateData } from '../shapes/rectangle/rectangle.interface';
import { LineCreateData } from '../shapes/line/line.interface';

/** Проверяет, что данные фигуры описывают прямоугольник. */
export const isRectangle = (
  shape: ShapesData,
): shape is RectangleCreateData => {
  return shape.type === ShapesTypes.RECTANGLE;
};

/** Проверяет, что данные фигуры описывают линию. */
export const isLine = (shape: ShapesData): shape is LineCreateData => {
  return shape.type === ShapesTypes.LINE;
};
