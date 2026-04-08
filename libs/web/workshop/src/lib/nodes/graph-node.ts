import { NodesTypes } from '../consts';

export abstract class GraphNode {
  id = `${Date.now()}`;
  type: NodesTypes = NodesTypes.NODE;
  parent: GraphNode | null = null;
  children: GraphNode[] = [];

  visible = true;
  locked = false;
  opacity = 1;

  addChild(child: GraphNode): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child: GraphNode): void {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  traverse(cb: (node: GraphNode) => void): void {
    cb(this);
    for (const child of this.children) {
      child.traverse(cb);
    }
  }

  protected abstract drawSelf(ctx: CanvasRenderingContext2D): void;

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha *= this.opacity;

    this.drawSelf(ctx);

    for (const child of this.children) {
      child.draw(ctx);
    }

    ctx.restore();
  }
}
