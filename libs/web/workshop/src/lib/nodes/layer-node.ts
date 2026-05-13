import { GraphNode } from './graph-node';
import { Bounds } from '../interfaces';
import { NodesTypes } from '../consts';

export class LayerNode extends GraphNode {
  offscreen?: OffscreenCanvas | HTMLCanvasElement;
  offscreenCtx?:
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  offscreenKey?: string;

  constructor(public layerData: unknown) {
    super();
    this.type = NodesTypes.LAYER;
  }

  getBounds(): Bounds {
    return { x: 0, y: 0, width: Infinity, height: Infinity };
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.children.forEach((child) => {
      if (child.visible) child.draw(ctx);
    });
  }
}
