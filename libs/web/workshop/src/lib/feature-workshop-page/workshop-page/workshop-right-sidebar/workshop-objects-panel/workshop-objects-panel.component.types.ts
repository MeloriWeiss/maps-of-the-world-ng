import type { ShapeNode } from '../../../../nodes';
import type { StampShape } from '../../../../shapes';

/** Локальный объект сцены, доступный в списке объектов редактора. */
export interface LocalObject {
  node: ShapeNode;
  parts: ShapeNode[];
  name: string;
  image: string | null;
  stamp: StampShape | null;
  count: number;
}
