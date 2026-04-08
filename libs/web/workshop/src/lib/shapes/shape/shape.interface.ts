import { ShapesTypes } from '../../consts';
import { SelectionRect } from '../../tools';
import { Point, Bounds } from '../../interfaces';

export interface BaseShape {
  strokeColor: string;
  opacity: number;
  strokeWidth: number;
  selected?: boolean;
  layerId?: string;
}

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
