import { Shape } from '../shapes';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuadtreeItem {
  bounds: Bounds;
  data: Shape;
}

export interface QuadtreeNode {
  bounds: Bounds;
  items: QuadtreeItem[];
  nodes: QuadtreeNode[];
  maxItems: number;
  maxDepth: number;
  depth: number;
}
