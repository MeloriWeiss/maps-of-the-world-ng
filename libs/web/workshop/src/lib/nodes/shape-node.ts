import { GraphNode } from './graph-node';
import { Bounds } from '../interfaces';
import { NodesTypes } from '../consts';
import { Shape } from '../shapes';

/** Узел графа, связывающий фигуру с её родителем и порядком отображения. */
export class ShapeNode extends GraphNode {
  constructor(public shape: Shape) {
    super();
    this.type = NodesTypes.SHAPE;
  }

  getBounds(): Bounds {
    return this.shape.getBounds();
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.shape.draw(ctx);
  }
}
