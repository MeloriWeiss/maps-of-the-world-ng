import type { NodesTypes, ShapesTypes } from '../consts';
import type { StampInstance, Line, Shape, TextureStroke } from '../shapes';

/** Общие поля узла графа, сериализуемого в локальный снимок. */
export interface SerializedBaseNode {
  id: string;
  type: NodesTypes;
  visible: boolean;
  locked?: boolean;
  isDirty: boolean;
  zIndex: number;
  childIndex?: number;
  children: SerializedNode[];
}

/** Сериализованный узел слоя с дополнительными данными слоя. */
export interface SerializedLayerNode extends SerializedBaseNode {
  type: NodesTypes.LAYER;
  layerData: unknown;
}

/** Сериализованный узел группы фигур. */
export interface SerializedGroupNode extends SerializedBaseNode {
  type: NodesTypes.GROUP;
}

/** Сериализованный узел, ссылающийся на отдельную фигуру. */
export interface SerializedShapeNode extends SerializedBaseNode {
  type: NodesTypes.SHAPE;
  shapeId: string;
}

/** Фигура в чанке вместе с узлом графа и её позицией в родителе. */
export interface SerializedChunkShape {
  shape: SerializedShape;
  node: SerializedShapeNode;
  parentId: string;
  index: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

/** Все поддерживаемые типы сериализованных узлов графа. */
export type SerializedNode =
  | SerializedLayerNode
  | SerializedGroupNode
  | SerializedShapeNode;

/** Общие свойства фигуры, сохраняемые в снимке карты. */
export interface SerializedBaseShape {
  id: string;
  objectId?: string;
  erasures?: Shape['erasures'];
  name?: string;
  type: ShapesTypes;
  strokeColor: string;
  opacity: number;
  strokeWidth: number;
  selected?: boolean;
  layerId?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  minZoom?: number;
  maxZoom?: number;
  mapObjectType?: string;
}

/** Сериализованные точки и стили линии. */
export interface SerializedLineShape extends SerializedBaseShape {
  type: ShapesTypes.LINE;
  points: Line['points'];
}

/** Геометрия, заливка и стили прямоугольника. */
export interface SerializedRectangleShape extends SerializedBaseShape {
  type: ShapesTypes.RECTANGLE;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
}

/** Точки мазка текстурой и параметры изображения и поворота. */
export interface SerializedTextureShape extends SerializedBaseShape {
  type: ShapesTypes.TEXTURE;
  points: TextureStroke['points'];
  textureId: string | null;
  textureUrl: string | null;
  textureScale: number;
  textureRotation: number;
  textureColor: string;
}

/** Текст, положение, шрифт и стили текстовой фигуры. */
export interface SerializedTextShape extends SerializedBaseShape {
  type: ShapesTypes.TEXT;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fillColor: string;
}

/** Ссылка на текстуру штампа и координаты его экземпляров. */
export interface SerializedStampShape extends SerializedBaseShape {
  type: ShapesTypes.STAMP;
  textureId: string;
  textureUrl: string;
  instances: StampInstance[];
}

/** Все типы фигур, поддерживаемые форматом снимка Workshop. */
export type SerializedShape =
  | SerializedTextShape
  | SerializedStampShape
  | SerializedLineShape
  | SerializedRectangleShape
  | SerializedTextureShape;

/** Версионированный снимок графа Workshop со списком фигур. */
export interface WorkshopSnapshot {
  version: 1 | 2;
  shapes: SerializedShape[];
  nodes: SerializedNode;
}
