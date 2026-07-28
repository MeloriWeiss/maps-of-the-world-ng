import { ShapesTypes } from '../../consts';
import { SelectionRect } from '../../tools';
import { Point, Bounds } from '../../interfaces';

export interface BaseShape {
  id: string;
  name?: string;
  strokeColor: string;
  opacity: number;
  strokeWidth: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  selected?: boolean;
  layerId?: string;
  minZoom?: number;
  maxZoom?: number;
  mapObjectType?: string;
}

export type CreateBaseShape = Omit<BaseShape, 'id'>;

export interface ShapeActions {
  draw: (ctx: CanvasRenderingContext2D) => void;
  whenReady: () => Promise<void>;
  clickOn: (point: Point) => boolean;
  selectByClick: (point: Point) => boolean;
  selectByDraw: (selectionRect: SelectionRect) => boolean;
  changePosition: (point: Point) => void;
  getBounds: () => Bounds;
  transform: (from: Bounds, to: Bounds) => void;
}

export interface Shape extends BaseShape, ShapeActions {
  type: ShapesTypes;
}
