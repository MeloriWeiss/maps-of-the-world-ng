import { ShapesTypes } from '../../consts';
import { SelectionRect } from '../../tools';
import { Point, Bounds } from '../../interfaces';

export interface BaseShape {
  id: string;
  strokeColor: string;
  opacity: number;
  strokeWidth: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  selected?: boolean;
  layerId?: string;
}

export type CreateBaseShape = Omit<BaseShape, 'id'>;

export interface ShapeActions {
  draw: (ctx: CanvasRenderingContext2D) => void;
  clickOn: (point: Point) => boolean;
  selectByClick: (point: Point) => boolean;
  selectByDraw: (selectionRect: SelectionRect) => boolean;
  changePosition: (point: Point) => void;
  getBounds: () => Bounds;
}

export interface Shape extends BaseShape, ShapeActions {
  type: ShapesTypes;
}
