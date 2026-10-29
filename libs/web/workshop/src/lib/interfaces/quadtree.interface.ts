import { Shape } from '../shapes';

/** Прямоугольные границы объекта в координатах карты. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Объект карты и его границы для пространственного индекса. */
export interface QuadtreeItem {
  bounds: Bounds;
  data: Shape;
}

/** Узел дерева области с объектами и вложенными четвертями. */
export interface QuadtreeNode {
  bounds: Bounds;
  items: QuadtreeItem[];
  nodes: QuadtreeNode[];
  maxItems: number;
  maxDepth: number;
  depth: number;
}
