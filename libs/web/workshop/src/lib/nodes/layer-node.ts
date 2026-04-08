import { GraphNode } from './graph-node';
import { NodesTypes } from '../consts';

export class LayerNode extends GraphNode {
  zIndex = 0;

  constructor() {
    super();
    this.type = NodesTypes.LAYER;
  }

  protected drawSelf(ctx: CanvasRenderingContext2D): void {
    const a = 1;
  }
}
