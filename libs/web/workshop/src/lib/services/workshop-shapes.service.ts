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

/** Создаёт фигуры и выполняет общие операции над их коллекцией. */
@Injectable()
export class WorkshopShapesService {
  #undo: SceneMutation[] = [];
  #redo: SceneMutation[] = [];
  #before: string | null = null;
  #beforeBounds: Map<string, Bounds> | null = null;
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  /** Синхронизирует доступность команд отмены и повтора с историей. */
  #updateHistoryAvailability() {
    this.canUndo.set(this.#undo.length > 0);
    this.canRedo.set(this.#redo.length > 0);
  }

  /** Запоминает исходное состояние перед группой изменений сцены. */
  beginOperation() {
    if (this.#before !== null) return;

    this.#before = this.#sceneGraphStorageService.exportSnapshot();
    this.#beforeBounds = this.#captureBounds();
  }

  /** Фиксирует изменения сцены в истории отмены и очищает историю повтора. */
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

  /** Отменяет последнюю операцию, если она есть в истории. */
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

  /** Повторяет последнюю отменённую операцию, если она доступна. */
  redo() {
    const next = this.#redo.pop();
    if (!next) return;

    this.#undo.push(next);
    this.#applyHistory(next, 'redo');
    this.#sceneGraphStorageService.persistCompletedOperation?.(next, 'redo');
    this.selectedShapes.set([]);
    this.#updateHistoryAvailability();
  }

  /** Применяет мутацию к сцене и отмечает удалённые загруженные фигуры. */
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

  /** Очищает историю отмены и повтора и сбрасывает состояние операции. */
  resetHistory() {
    this.#undo = [];
    this.#redo = [];
    this.#before = null;
    this.#beforeBounds = null;
    this.#updateHistoryAvailability();
  }

  /** Сохраняет текущие границы фигур для сравнения до и после операции. */
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

  /** Добавляет фигуру в граф сцены и отмечает её после завершения загрузки. */
  createShape(shape: Shape) {
    this.#sceneGraphStorageService.addShape(shape.id, shape);
    this.#sceneGraphService.createShapeNode(shape);
    void shape
      .whenReady()
      .then(() => this.#sceneGraphService.markShapeDirty(shape));
  }

  /** Возвращает видимые фигуры, исключая заблокированные родительскими узлами. */
  getVisibleShapes() {
    return this.#sceneGraphService
      .getVisibleShapes()
      .filter((shape) => !this.#isShapeLocked(shape.id));
  }

  /** Проверяет, заблокирована ли фигура одним из родительских контейнеров. */
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

  /** Снимает выделение со всех выбранных фигур и помечает их изменёнными. */
  clearSelection() {
    for (const shape of this.#sceneGraphStorageService.shapes.values()) {
      if (!shape.selected) continue;
      shape.selected = false;
      this.#sceneGraphService.markShapeDirty(shape);
    }
    this.selectedShapes.set([]);
  }

  /** Планирует сохранение текущего графа сцены. */
  saveChanges() {
    this.#sceneGraphService.saveNodes();
  }

  /** Устанавливает список выбранных фигур. */
  setSelectedShapes(shapes: Shape[]) {
    this.selectedShapes.set(shapes);
  }

  /**
   * Вычисляет объединённые границы набора фигур.
   *
   * @param shapes Фигуры для расчёта; по умолчанию используются выбранные.
   * @returns Границы набора или `null`, если список пуст.
   */
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

  /** Изменяет размер и положение выбранных фигур между двумя прямоугольниками. */
  transformSelectedShapes(from: Bounds, to: Bounds) {
    for (const shape of this.selectedShapes()) {
      shape.transform(from, to);
      this.markShapeDirty(shape);
    }
  }

  /** Применяет изменения фигуры, если она не заблокирована. */
  updateShape(shape: Shape, patch: Partial<Shape>) {
    if (this.#isShapeLocked(shape.id)) return;
    Object.assign(shape, patch);
    this.#sceneGraphService.markShapeDirty(shape);
    this.#sceneGraphService.saveNodes();
  }

  /** Помечает фигуру изменённой для обновления её слоя и сцены. */
  markShapeDirty(shape: Shape) {
    this.#sceneGraphService.markShapeDirty(shape);
  }

  /** Удаляет выбранные и незаблокированные фигуры и фиксирует операцию. */
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
