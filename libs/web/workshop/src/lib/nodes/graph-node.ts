import { Bounds } from '../interfaces';
import { NodesTypes } from '../consts';

export abstract class GraphNode {
  readonly id = crypto.randomUUID();

  type = NodesTypes.NODE;
  parent: GraphNode | null = null;
  children: GraphNode[] = [];
  visible = true;
  isDirty = true;
  zIndex = 0;

  abstract getBounds(): Bounds;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  addChild(node: GraphNode) {
    node.parent = this;
    this.children.push(node);
  }

  removeChild(id: string) {
    const index = this.children.findIndex((n) => n.id === id);
    if (index > -1) this.children.splice(index, 1);
  }
}
