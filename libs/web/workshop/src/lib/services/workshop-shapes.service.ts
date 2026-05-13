import { computed, inject, Injectable, signal } from '@angular/core';
import { Shape } from '../shapes';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';
import { WorkshopSceneGraphService } from './workshop-scene-graph.service';
import { ShapeNode } from '../nodes';

@Injectable()
export class WorkshopShapesService {
  #sceneGraphStorageService = inject(WorkshopSceneGraphStorageService);
  #sceneGraphService = inject(WorkshopSceneGraphService);

  selectedShapes = signal<Shape[]>([]);
  selectedShape = computed(() => this.selectedShapes()[0] ?? null);

  createShape(shape: Shape) {
    this.#sceneGraphStorageService.addShape(shape.id, shape);
    this.#sceneGraphService.createShapeNode(shape);
  }

  getVisibleShapes() {
    return this.#sceneGraphService.getVisibleShapes();
  }

  clearSelection() {
    for (const shape of this.#sceneGraphStorageService.shapes.values()) {
      if (!shape.selected) continue;
      shape.selected = false;
      this.#sceneGraphService.markShapeDirty(shape);
    }
    this.selectedShapes.set([]);
  }

  saveChanges() {
    this.#sceneGraphService.saveNodes();
  }

  setSelectedShapes(shapes: Shape[]) {
    this.selectedShapes.set(shapes);
  }

  updateShape(shape: Shape, patch: Partial<Shape>) {
    Object.assign(shape, patch);
    this.#sceneGraphService.markShapeDirty(shape);
    this.#sceneGraphService.saveNodes();
  }

  markShapeDirty(shape: Shape) {
    this.#sceneGraphService.markShapeDirty(shape);
  }

  deleteSelectedShapes() {
    const selectedNodeIds: string[] = [];

    for (const node of this.#sceneGraphStorageService.nodes.values()) {
      if (!(node instanceof ShapeNode)) continue;

      const shape = node.shape;
      if (!shape?.selected) continue;

      selectedNodeIds.push(node.id);
    }

    for (const nodeId of selectedNodeIds) {
      this.#sceneGraphService.removeNode(nodeId);
    }
  }
}
