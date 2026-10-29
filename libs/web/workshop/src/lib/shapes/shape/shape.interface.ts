import { ShapesTypes } from '../../consts';
import { SelectionRect } from '../../tools';
import { Point, Bounds } from '../../interfaces';
import type { ShapeRenderContext } from '../../rendering/shape-render-context';

/** Общие сериализуемые свойства фигуры и её визуальных эффектов. */
export interface BaseShape {
  objectId?: string;
  erasures?: { x: number; y: number; radius: number }[];
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

/** Свойства для создания фигуры до назначения ей идентификатора. */
export type CreateBaseShape = Omit<BaseShape, 'id'>;

/** Операции отрисовки, выбора, стирания и преобразования фигуры. */
export interface ShapeActions {
  render: (ctx: CanvasRenderingContext2D, context?: ShapeRenderContext) => void;
  erase: (
    point: Point,
    radius: number,
    objectsOnly?: boolean,
  ) => 'none' | 'changed' | 'remove';
  draw: (ctx: CanvasRenderingContext2D, context?: ShapeRenderContext) => void;
  prepareRender: (context?: ShapeRenderContext) => Promise<() => void>;
  whenReady: () => Promise<void>;
  clickOn: (point: Point) => boolean;
  selectByClick: (point: Point) => boolean;
  selectByDraw: (selectionRect: SelectionRect) => boolean;
  changePosition: (point: Point) => void;
  getBounds: (context?: ShapeRenderContext) => Bounds;
  transform: (from: Bounds, to: Bounds) => void;
}

/** Полный контракт фигуры с данными и операциями редактора. */
export interface Shape extends BaseShape, ShapeActions {
  type: ShapesTypes;
}
