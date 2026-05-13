import { Bounds } from '../interfaces';
import { GraphNode } from './graph-node';
import { NodesTypes } from '../consts';

export class GroupNode extends GraphNode {
  constructor() {
    super();
    this.type = NodesTypes.GROUP;
  }

  getBounds(): Bounds {
    return this.children.reduce(
      (union, child) => {
        const b = child.getBounds();

        return {
          x: Math.min(union.x, b.x),
          y: Math.min(union.y, b.y),
          width: Math.max(union.width, b.width),
          height: Math.max(union.height, b.height),
        };
      },
      { x: Infinity, y: Infinity, width: 0, height: 0 },
    );
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.children.sort((a, b) => a.zIndex - b.zIndex);
    this.children.forEach((child) => child.draw(ctx));
  }
}
