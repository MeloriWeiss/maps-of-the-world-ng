import { GraphNode } from './graph-node';
import { Shape } from '../shapes';
import { NodesTypes } from '../consts';

export class ShapeNode extends GraphNode {
  readonly shape: Shape;

  constructor(shape: Shape) {
    super();
    this.type = NodesTypes.SHAPE;
    this.shape = shape;
  }

  protected drawSelf(ctx: CanvasRenderingContext2D): void {
    this.shape.draw(ctx);
  }
}
