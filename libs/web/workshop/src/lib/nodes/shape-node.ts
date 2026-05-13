import { GraphNode } from './graph-node';
import { Bounds } from '../interfaces';
import { NodesTypes } from '../consts';
import { Shape } from '../shapes';

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
