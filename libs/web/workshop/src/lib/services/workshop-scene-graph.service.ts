import { inject, Injectable } from '@angular/core';
import { Shape } from '../shapes';
import { debounceTime, interval, merge, of, Subject, switchMap } from 'rxjs';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';
import { GraphNode, GroupNode, LayerNode, ShapeNode } from '../nodes';
import { Bounds } from '../interfaces';
import { NodesTypes } from '../consts';

@Injectable()
export class WorkshopSceneGraphService {
  #shapesStorageService = inject(WorkshopSceneGraphStorageService);

  root = this.#shapesStorageService.nodesRoot;

  activeNodeId = this.#shapesStorageService.activeNodeId;

  #nodesChanges$ = new Subject<void>();

  #autoSavesInterval$ = interval(60000);
  #savesDebounceTime = 1;

  nodesSaves$ = merge(this.#nodesChanges$, this.#autoSavesInterval$).pipe(
    debounceTime(this.#savesDebounceTime),
    switchMap(() => {
      return this.#sendNodes();
    }),
  );

  createShapeNode(shape: Shape, nodeToId?: string) {
    const shapeNode = new ShapeNode(shape);
    const targetNode = this.#resolveParentNode(nodeToId);
    targetNode.addChild(shapeNode);
    this.registerNode(shapeNode);

    this.#markLayerDirty(targetNode);
    this.#touchGraph();
    this.saveNodes();
  }

  moveToLayer(shapeId: string, newLayerId: string) {
    const shapeNode = this.findNodeById(shapeId) as ShapeNode;
    const oldLayer = shapeNode.parent as LayerNode;
    const newLayer = this.findNodeById(newLayerId) as LayerNode;

    oldLayer?.removeChild(shapeId);
    newLayer?.addChild(shapeNode);

    this.root.update((r) => r);
  }

  private findNodeById(id: string): GraphNode | null {
    function search(node: GraphNode): GraphNode | null {
      if (node.id === id) return node;

      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    }

    return search(this.root());
  }

  addLayerNode(
    layerData: any,
    options: {
      parentId?: string;
      index?: number;
    } = {},
  ) {
    const layerNode = new LayerNode(layerData);
    this.registerNode(layerNode);
    const parentNode = this.#resolveParentNode(options.parentId);
    const insertIndex = options.index ?? parentNode.children.length;
    parentNode.children.splice(insertIndex, 0, layerNode);
    layerNode.parent = parentNode;

    this.setActiveNode(layerNode.id);
    this.#markLayerDirty(parentNode);
    this.#touchGraph();
    this.saveNodes();
  }

  addGroupNode(options: { parentId?: string; index?: number } = {}) {
    const groupNode = new GroupNode();
    this.registerNode(groupNode);

    const parentNode = this.#resolveParentNode(options.parentId);
    const insertIndex = options.index ?? parentNode.children.length;
    parentNode.children.splice(insertIndex, 0, groupNode);
    groupNode.parent = parentNode;

    this.setActiveNode(groupNode.id);
    this.#markLayerDirty(parentNode);
    this.#touchGraph();
    this.saveNodes();
  }

  getNodes() {
    this.#shapesStorageService.loadFromStorage();
    this.root.update((root) => root);

    return of(void 0);
  }

  saveNodes() {
    this.#nodesChanges$.next();
  }

  setActiveNode(layerId: string) {
    this.activeNodeId.set(layerId);
  }

  clearActiveNode() {
    this.activeNodeId.set(null);
  }

  isNodeActive(id: string): boolean {
    return this.activeNodeId() === id;
  }

  setNodeVisibility(nodeId: string, visible: boolean) {
    const node = this.nodeById(nodeId);
    if (!node) return;

    node.visible = visible;
    this.#markLayerDirty(node);
    this.#touchGraph();
    this.saveNodes();
  }

  getVisibleShapes(): Shape[] {
    const result: Shape[] = [];
    this.#collectVisibleShapes(this.root(), true, result);
    return result;
  }

  getVisibleShapesInViewport(viewport: Bounds): Shape[] {
    const result: Shape[] = [];
    this.#collectVisibleShapesInViewport(this.root(), true, viewport, result);
    return result;
  }

  markShapeDirty(shape: Shape) {
    const shapeNode = this.#findShapeNode(shape.id);
    if (!shapeNode) return;

    this.#markLayerDirty(shapeNode.parent);
    this.#touchGraph();
  }

  removeNode(nodeId: string) {
    const node = this.nodeById(nodeId);
    if (!node || node === this.root()) return;

    node.parent?.removeChild(node.id);
    this.#markLayerDirty(node.parent);
    this.#removeNodeDeep(node);

    if (this.activeNodeId() === nodeId) {
      this.activeNodeId.set(node.parent?.id ?? this.root().id);
    }

    this.#touchGraph();
    this.saveNodes();
  }

  moveNode(
    nodeId: string,
    targetNodeId: string,
    mode: 'inside' | 'after' = 'after',
  ) {
    if (nodeId === targetNodeId) return;

    const node = this.nodeById(nodeId);
    const targetNode = this.nodeById(targetNodeId);
    if (!node || !targetNode || node === this.root()) return;
    if (this.#isDescendant(node, targetNode)) return;

    const oldParent = node.parent;
    if (!oldParent) return;

    let newParent: GraphNode;
    let insertIndex: number;

    if (mode === 'inside' && targetNode.type !== NodesTypes.SHAPE) {
      newParent = targetNode;
      insertIndex = newParent.children.length;
    } else {
      newParent = targetNode.parent ?? this.root();
      insertIndex =
        newParent.children.findIndex((child) => child.id === targetNode.id) + 1;
      if (insertIndex <= 0) insertIndex = newParent.children.length;
    }

    const oldIndexInParent = oldParent.children.findIndex(
      (child) => child.id === node.id,
    );
    oldParent.removeChild(node.id);

    // adjust index when moving within same parent
    if (
      newParent.id === oldParent.id &&
      oldIndexInParent !== -1 &&
      oldIndexInParent < insertIndex
    ) {
      insertIndex -= 1;
    }

    newParent.children.splice(insertIndex, 0, node);
    node.parent = newParent;

    this.#markLayerDirty(oldParent);
    this.#markLayerDirty(newParent);
    this.#touchGraph();
    this.saveNodes();
  }

  registerNode(node: GraphNode) {
    this.#shapesStorageService.nodes.set(node.id, node);
  }

  nodeById(id: string) {
    return this.#shapesStorageService.nodes.get(id) ?? null;
  }

  #sendNodes() {
    this.#shapesStorageService.saveToStorage();
    return of(void 0);
  }

  #resolveParentNode(nodeId?: string | null): GraphNode {
    const resolvedNodeId = nodeId ?? this.activeNodeId() ?? this.root().id;
    const resolvedNode = this.nodeById(resolvedNodeId);

    if (!resolvedNode) return this.root();
    if (resolvedNode.type === NodesTypes.SHAPE) {
      return resolvedNode.parent ?? this.root();
    }

    return resolvedNode;
  }

  #touchGraph() {
    this.#shapesStorageService.graphVersion.update((version) => version + 1);
  }

  #removeNodeDeep(node: GraphNode) {
    for (const child of node.children) {
      this.#removeNodeDeep(child);
      child.parent = null;
    }

    node.children = [];

    if (node.type === NodesTypes.SHAPE) {
      const shapeNode = node as ShapeNode;
      this.#shapesStorageService.shapes.delete(shapeNode.shape.id);
    }

    this.#shapesStorageService.nodes.delete(node.id);
    node.parent = null;
  }

  #collectVisibleShapes(node: GraphNode, isVisible: boolean, target: Shape[]) {
    const nextVisible = isVisible && node.visible;
    if (!nextVisible) return;

    if (node.type === NodesTypes.SHAPE) {
      const shapeNode = node as ShapeNode;
      target.push(shapeNode.shape);
      return;
    }

    for (const child of node.children) {
      this.#collectVisibleShapes(child, nextVisible, target);
    }
  }

  #collectVisibleShapesInViewport(
    node: GraphNode,
    isVisible: boolean,
    viewport: Bounds,
    target: Shape[],
  ) {
    const nextVisible = isVisible && node.visible;
    if (!nextVisible) return;

    if (node.type === NodesTypes.SHAPE) {
      const shapeNode = node as ShapeNode;
      if (this.#intersects(shapeNode.shape.getBounds(), viewport)) {
        target.push(shapeNode.shape);
      }
      return;
    }

    for (const child of node.children) {
      this.#collectVisibleShapesInViewport(
        child,
        nextVisible,
        viewport,
        target,
      );
    }
  }

  #intersects(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }

  #findShapeNode(shapeId: string): ShapeNode | null {
    for (const node of this.#shapesStorageService.nodes.values()) {
      if (node.type !== NodesTypes.SHAPE) continue;
      const shapeNode = node as ShapeNode;
      if (shapeNode.shape.id === shapeId) return shapeNode;
    }

    return null;
  }

  #markLayerDirty(node: GraphNode | null | undefined) {
    let current = node;
    while (current) {
      if (current.type === NodesTypes.LAYER) {
        current.isDirty = true;
      }
      current = current.parent;
    }
  }

  #isDescendant(potentialParent: GraphNode, candidate: GraphNode): boolean {
    if (potentialParent.id === candidate.id) return true;

    for (const child of potentialParent.children) {
      if (this.#isDescendant(child, candidate)) return true;
    }

    return false;
  }
}
