import { computed, inject, Injectable, signal } from '@angular/core';
import { Shape } from '../shapes';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';
import { WorkshopSceneGraphService } from './workshop-scene-graph.service';
import { ShapeNode } from '../nodes';
import { Bounds } from '../interfaces';
import {
  applySceneMutation,
  createSceneMutation,
  SceneMutation,
} from './scene-history';

@Injectable()
export class WorkshopShapesService {
  #undo: SceneMutation[] = [];
  #redo: SceneMutation[] = [];
  #before: string | null = null;
  #beforeBounds: Map<string, Bounds> | null = null;
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  #updateHistoryAvailability() {
    this.canUndo.set(this.#undo.length > 0);
    this.canRedo.set(this.#redo.length > 0);
  }

  beginOperation() {
    if (this.#before !== null) return;
    this.#before = this.#sceneGraphStorageService.exportSnapshot();
    this.#beforeBounds = this.#captureBounds();
  }

  endOperation() {
    const before = this.#before;
    this.#before = null;
    const beforeBounds = this.#beforeBounds;
    this.#beforeBounds = null;
    if (!before) return;
    const after = this.#sceneGraphStorageService.exportSnapshot();
    if (before === after) return;
    const mutation = createSceneMutation(
      before,
      after,
      beforeBounds ?? new Map(),
      this.#captureBounds(),
    );
    if (!mutation.shapes.length && !mutation.nodes.length) return;
    this.#undo.push(mutation);
    if (this.#undo.length > 30) this.#undo.shift();
    while (
      this.#undo.length > 1 &&
      this.#undo.reduce((size, item) => size + JSON.stringify(item).length, 0) >
        8_000_000
    )
      this.#undo.shift();
    this.#redo = [];
    this.#updateHistoryAvailability();
    this.#sceneGraphStorageService.persistCompletedOperation?.(
      mutation,
      'redo',
    );
  }

  undo() {
    const previous = this.#undo.pop();
    if (!previous) return;
    this.#redo.push(previous);
    this.#applyHistory(previous, 'undo');
    this.#sceneGraphStorageService.persistCompletedOperation?.(
      previous,
      'undo',
    );
    this.selectedShapes.set([]);
    this.#updateHistoryAvailability();
  }

  redo() {
    const next = this.#redo.pop();
    if (!next) return;
    this.#undo.push(next);
    this.#applyHistory(next, 'redo');
    this.#sceneGraphStorageService.persistCompletedOperation?.(next, 'redo');
    this.selectedShapes.set([]);
    this.#updateHistoryAvailability();
  }

  #applyHistory(mutation: SceneMutation, direction: 'undo' | 'redo') {
    const loadedIds = new Set(this.#sceneGraphStorageService.shapes.keys());
    const updated = applySceneMutation(
      this.#sceneGraphStorageService.exportSnapshot(),
      mutation,
      direction,
    );
    this.#sceneGraphStorageService.importSnapshot(updated);
    for (const id of loadedIds) {
      if (!this.#sceneGraphStorageService.shapes.has(id)) {
        this.#sceneGraphStorageService.deletedShapeIds.add(id);
      }
    }
  }

  resetHistory() {
    this.#undo = [];
    this.#redo = [];
    this.#before = null;
    this.#beforeBounds = null;
    this.#updateHistoryAvailability();
  }

  #captureBounds(): Map<string, Bounds> {
    return new Map(
      [...this.#sceneGraphStorageService.shapes].map(([id, shape]) => [
        id,
        { ...shape.getBounds() },
      ]),
    );
  }

  #sceneGraphStorageService = inject(WorkshopSceneGraphStorageService);
  #sceneGraphService = inject(WorkshopSceneGraphService);

  selectedShapes = signal<Shape[]>([]);
  selectedShape = computed(() => this.selectedShapes()[0] ?? null);

  createShape(shape: Shape) {
    this.#sceneGraphStorageService.addShape(shape.id, shape);
    this.#sceneGraphService.createShapeNode(shape);
    void shape
      .whenReady()
      .then(() => this.#sceneGraphService.markShapeDirty(shape));
  }

  getVisibleShapes() {
    return this.#sceneGraphService
      .getVisibleShapes()
      .filter((shape) => !this.#isShapeLocked(shape.id));
  }

  #isShapeLocked(shapeId: string) {
    for (const node of this.#sceneGraphStorageService.nodes.values()) {
      if (!(node instanceof ShapeNode) || node.shape.id !== shapeId) continue;
      let parent = node.parent;
      while (parent) {
        if (parent.locked) return true;
        parent = parent.parent;
      }
    }
    return false;
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

  getSelectionBounds(shapes = this.selectedShapes()): Bounds | null {
    if (!shapes.length) return null;

    const bounds = shapes.map((shape) => shape.getBounds());
    const minX = Math.min(...bounds.map((item) => item.x));
    const minY = Math.min(...bounds.map((item) => item.y));
    const maxX = Math.max(...bounds.map((item) => item.x + item.width));
    const maxY = Math.max(...bounds.map((item) => item.y + item.height));

    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 0.001),
      height: Math.max(maxY - minY, 0.001),
    };
  }

  transformSelectedShapes(from: Bounds, to: Bounds) {
    for (const shape of this.selectedShapes()) {
      shape.transform(from, to);
      this.markShapeDirty(shape);
    }
  }

  updateShape(shape: Shape, patch: Partial<Shape>) {
    if (this.#isShapeLocked(shape.id)) return;
    Object.assign(shape, patch);
    this.#sceneGraphService.markShapeDirty(shape);
    this.#sceneGraphService.saveNodes();
  }

  markShapeDirty(shape: Shape) {
    this.#sceneGraphService.markShapeDirty(shape);
  }

  deleteSelectedShapes() {
    this.beginOperation();
    const selectedNodeIds: string[] = [];

    for (const node of this.#sceneGraphStorageService.nodes.values()) {
      if (!(node instanceof ShapeNode)) continue;

      const shape = node.shape;
      if (!shape?.selected) continue;
      if (this.#isShapeLocked(shape.id)) continue;

      selectedNodeIds.push(node.id);
    }

    for (const nodeId of selectedNodeIds) {
      this.#sceneGraphService.removeNode(nodeId);
    }
    this.selectedShapes.set([]);
    this.endOperation();
  }
}
