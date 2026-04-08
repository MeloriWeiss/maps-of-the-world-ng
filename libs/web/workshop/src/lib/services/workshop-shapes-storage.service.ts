import { Injectable, signal } from '@angular/core';
import { GraphNode, LayerNode } from '../nodes';

@Injectable()
export class WorkshopShapesStorageService {
  rootNode = signal<LayerNode>(new LayerNode());
  nodes = signal<Record<string, GraphNode>>({
    [this.rootNode().id]: this.rootNode(),
  });

  activeLayerId = signal<string | null>(null);
  activeShapeId = signal<string | null>(null);
}
