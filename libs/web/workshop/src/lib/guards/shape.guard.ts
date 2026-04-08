import { ShapesTypes } from '../consts';
import { ShapesData } from '../interfaces';
import { RectangleCreateData } from '../shapes/rectangle/rectangle.interface';
import { LineCreateData } from '../shapes/line/line.interface';

export const isRectangle = (
  shape: ShapesData,
): shape is RectangleCreateData => {
  return shape.type === ShapesTypes.RECTANGLE;
};

export const isLine = (shape: ShapesData): shape is LineCreateData => {
  return shape.type === ShapesTypes.LINE;
};
