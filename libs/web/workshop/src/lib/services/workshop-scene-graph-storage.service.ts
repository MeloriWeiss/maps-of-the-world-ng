import { Injectable, signal } from '@angular/core';
import type { SceneMutation } from './scene-history';
import { NodesTypes, ShapesTypes } from '../consts';
import { isMapChunkBody } from '@wm/shared/workshop';
import { GraphNode, GroupNode, LayerNode, ShapeNode } from '../nodes';
import { restoreSerializedShape } from '../shapes/restore-serialized-shape';
import {
  Text,
  StampShape,
  StampInstance,
  Line,
  LineShape,
  Rectangle,
  RectangleShape,
  Shape,
  TextureStroke,
} from '../shapes';

export interface SerializedBaseNode {
  id: string;
  type: NodesTypes;
  visible: boolean;
  locked?: boolean;
  isDirty: boolean;
  zIndex: number;
  childIndex?: number;
  children: SerializedNode[];
}

interface SerializedLayerNode extends SerializedBaseNode {
  type: NodesTypes.LAYER;
  layerData: unknown;
}

interface SerializedGroupNode extends SerializedBaseNode {
  type: NodesTypes.GROUP;
}

interface SerializedShapeNode extends SerializedBaseNode {
  type: NodesTypes.SHAPE;
  shapeId: string;
}

export interface SerializedChunkShape {
  shape: SerializedShape;
  node: SerializedShapeNode;
  parentId: string;
  index: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

export type SerializedNode =
  | SerializedLayerNode
  | SerializedGroupNode
  | SerializedShapeNode;

interface SerializedBaseShape {
  id: string;
  objectId?: string;
  erasures?: Shape['erasures'];
  name?: string;
  type: ShapesTypes;
  strokeColor: string;
  opacity: number;
  strokeWidth: number;
  selected?: boolean;
  layerId?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  minZoom?: number;
  maxZoom?: number;
  mapObjectType?: string;
}

interface SerializedLineShape extends SerializedBaseShape {
  type: ShapesTypes.LINE;
  points: Line['points'];
}

interface SerializedRectangleShape extends SerializedBaseShape {
  type: ShapesTypes.RECTANGLE;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
}

interface SerializedTextureShape extends SerializedBaseShape {
  type: ShapesTypes.TEXTURE;
  points: TextureStroke['points'];
  textureId: string | null;
  textureUrl: string | null;
  textureScale: number;
  textureRotation: number;
  textureColor: string;
}

interface SerializedTextShape extends SerializedBaseShape {
  type: ShapesTypes.TEXT;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fillColor: string;
}
interface SerializedStampShape extends SerializedBaseShape {
  type: ShapesTypes.STAMP;
  textureId: string;
  textureUrl: string;
  instances: StampInstance[];
}

export type SerializedShape =
  | SerializedTextShape
  | SerializedStampShape
  | SerializedLineShape
  | SerializedRectangleShape
  | SerializedTextureShape;

export interface WorkshopSnapshot {
  version: 1 | 2;
  shapes: SerializedShape[];
  nodes: SerializedNode;
}

@Injectable()
export class WorkshopSceneGraphStorageService {
  persistRemoteDraft: (() => void) | null = null;
  persistCompletedOperation:
    | ((mutation: SceneMutation, direction: 'undo' | 'redo') => void)
    | null = null;
  readonly deletedShapeIds = new Set<string>();
  sceneBounds: import('@wm/shared/workshop').WorldBounds | null = null;
  #pendingNodes = new Map<
    string,
    { node: SerializedShapeNode; parentId: string; index: number }
  >();
  #nodeOrder = new Map<string, number>();
  #nodeParent = new Map<string, string>();

  importSceneRoot(id: string) {
    this.shapes.clear();
    this.nodes.clear();
    this.deletedShapeIds.clear();
    this.#pendingNodes.clear();
    this.#nodeOrder.clear();
    this.#nodeParent.clear();
    const root = new LayerNode({ name: 'Карта' });
    this.#setReadonlyId(root, id);
    this.nodes.set(id, root);
    this.nodesRoot.set(root);
    this.activeNodeId.set(id);
    this.graphVersion.update((value) => value + 1);
  }

  importSceneContainers(
    containers: readonly {
      id: string;
      parentId: string | null;
      kind: string;
      name: string;
      visible: boolean;
      locked: boolean;
      orderKey: number;
      childIndex: number;
    }[],
    overwrite = false,
  ) {
    for (const item of containers) {
      const existing = this.nodes.get(item.id);
      if (existing) {
        if (!overwrite) continue;
        this.#nodeOrder.set(item.id, item.childIndex);
        existing.visible = item.visible;
        existing.locked = item.locked;
        existing.zIndex = item.orderKey;
        if (existing instanceof LayerNode)
          existing.layerData = { name: item.name };
        const parent = item.parentId ? this.nodes.get(item.parentId) : null;
        if (parent && existing.parent !== parent) {
          existing.parent?.removeChild(existing.id);
          parent.addChild(existing);
        }
        existing.parent?.children.sort(
          (a, b) =>
            (this.#nodeOrder.get(a.id) ?? a.zIndex) -
            (this.#nodeOrder.get(b.id) ?? b.zIndex),
        );
        continue;
      }
      const parent = item.parentId ? this.nodes.get(item.parentId) : null;
      if (!parent) continue;
      const node =
        item.kind === 'layer'
          ? new LayerNode({ name: item.name })
          : new GroupNode();
      this.#setReadonlyId(node, item.id);
      node.visible = item.visible;
      node.locked = item.locked;
      node.zIndex = item.orderKey;
      parent.addChild(node);
      this.#nodeOrder.set(node.id, item.childIndex);
      this.#nodeParent.set(node.id, parent.id);
      parent.children.sort(
        (a, b) =>
          (this.#nodeOrder.get(a.id) ?? a.zIndex) -
          (this.#nodeOrder.get(b.id) ?? b.zIndex),
      );
      this.nodes.set(node.id, node);
    }
    this.graphVersion.update((value) => value + 1);
  }

  indexSceneNodes(nodes: SerializedNode) {
    this.#pendingNodes.clear();
    this.#nodeOrder.clear();
    this.#nodeParent.clear();
    const visit = (node: SerializedNode) =>
      node.children.forEach((child, index) => {
        const childIndex = child.childIndex ?? index;
        this.#nodeOrder.set(child.id, childIndex);
        this.#nodeParent.set(child.id, node.id);
        if (child.type === NodesTypes.SHAPE)
          this.#pendingNodes.set(child.shapeId, {
            node: child,
            parentId: node.id,
            index: childIndex,
          });
        else visit(child);
      });
    visit(nodes);
  }

  pendingChunkNode(shapeId: string) {
    return this.#pendingNodes.get(shapeId);
  }

  nextChunkChildIndex(parentId: string) {
    let next = 0;
    for (const pending of this.#pendingNodes.values()) {
      if (pending.parentId === parentId)
        next = Math.max(next, pending.index + 1);
    }
    return next;
  }

  replaceChunkMetadata(
    removedIds: ReadonlySet<string>,
    records: readonly SerializedChunkShape[],
  ) {
    for (const id of removedIds) {
      const pending = this.#pendingNodes.get(id);
      this.#pendingNodes.delete(id);
      if (pending) {
        this.#nodeOrder.delete(pending.node.id);
        this.#nodeParent.delete(pending.node.id);
      }
    }
    for (const record of records) {
      this.#pendingNodes.set(record.shape.id, {
        node: record.node,
        parentId: record.parentId,
        index: record.index,
      });
      this.#nodeOrder.set(record.node.id, record.index);
      this.#nodeParent.set(record.node.id, record.parentId);
    }
  }

  importSceneNodes(nodes: SerializedNode) {
    this.indexSceneNodes(nodes);
    const strip = (node: SerializedNode): SerializedNode => ({
      ...node,
      children: node.children.flatMap((child) => {
        if (child.type === NodesTypes.SHAPE) {
          return [];
        }
        return [strip(child)];
      }),
    });
    this.importSnapshot(
      JSON.stringify({ version: 2, shapes: [], nodes: strip(nodes) }),
    );
  }

  async importChunk(raw: string, isCurrent = () => true, overwrite = false) {
    const input: unknown = JSON.parse(raw);
    if (!isMapChunkBody(input)) throw new Error('Invalid chunk data');
    const records = input as unknown as SerializedChunkShape[];
    if (records.some((record) => !this.nodes.has(record.parentId)))
      throw new Error('Invalid chunk parent');
    for (const record of records) {
      this.#pendingNodes.set(record.shape.id, {
        node: record.node,
        parentId: record.parentId,
        index: record.index,
      });
      this.#nodeOrder.set(record.node.id, record.index);
      this.#nodeParent.set(record.node.id, record.parentId);
    }
    const restored = this.#deserializeShapes(
      records.map((record) => record.shape as unknown as SerializedShape),
    );
    await Promise.all([...restored.values()].map((shape) => shape.whenReady()));
    if (!isCurrent()) return;
    for (const [id, shape] of restored) {
      if (this.shapes.has(id) && !overwrite) continue;
      const pending = this.#pendingNodes.get(id);
      if (!pending) continue;
      const parent = this.nodes.get(pending.parentId);
      if (!parent) continue;
      const previous = this.nodes.get(pending.node.id);
      previous?.parent?.removeChild(pending.node.id);
      this.shapes.set(id, shape);
      const node = this.#deserializeNode(pending.node);
      node.zIndex = pending.node.zIndex;
      node.parent = parent;
      this.nodes.set(node.id, node);
      parent.children.push(node);
      this.#nodeOrder.set(node.id, pending.index);
      this.#nodeParent.set(node.id, pending.parentId);
      parent.children.sort(
        (a, b) =>
          (this.#nodeOrder.get(a.id) ?? a.zIndex) -
          (this.#nodeOrder.get(b.id) ?? b.zIndex),
      );
    }
    this.graphVersion.update((value) => value + 1);
  }

  exportShapes(ids?: ReadonlySet<string>) {
    const shapes = ids
      ? [...ids].flatMap((id) => {
          const shape = this.shapes.get(id);
          return shape ? [shape] : [];
        })
      : [...this.shapes.values()];
    return shapes.map((shape) => this.#serializeShape(shape));
  }

  exportNodes() {
    return this.#serializeNode(this.nodesRoot());
  }

  exportManifestNodes(): SerializedNode {
    const serialize = (node: GraphNode, childIndex = 0): SerializedNode => {
      const children = node.children
        .filter((child) => !(child instanceof ShapeNode))
        .map((child, index) => {
          const stableIndex =
            this.#nodeParent.get(child.id) === node.id
              ? (this.#nodeOrder.get(child.id) ?? index)
              : index;
          this.#nodeOrder.set(child.id, stableIndex);
          this.#nodeParent.set(child.id, node.id);
          return serialize(child, stableIndex);
        });
      const base = {
        id: node.id,
        visible: node.visible,
        locked: node.locked,
        isDirty: node.isDirty,
        zIndex: node.zIndex,
        childIndex,
        children,
      };
      if (node.type === NodesTypes.LAYER)
        return {
          ...base,
          type: NodesTypes.LAYER,
          layerData: (node as LayerNode).layerData,
        };
      return node.type === NodesTypes.GROUP
        ? { ...base, type: NodesTypes.GROUP }
        : { ...base, type: NodesTypes.GROUP };
    };
    return serialize(this.nodesRoot());
  }

  releaseChunk(ids: ReadonlySet<string>) {
    for (const node of this.nodes.values()) {
      if (!(node instanceof ShapeNode) || !ids.has(node.shape.id)) continue;
      node.parent?.removeChild(node.id);
      this.nodes.delete(node.id);
      this.shapes.delete(node.shape.id);
    }
    this.graphVersion.update((value) => value + 1);
  }

  #nodesStorageKey = 'nodes';
  #shapesStorageKey = 'shapes';

  nodesRoot = signal<GraphNode>(new LayerNode({}));
  graphVersion = signal(0);
  nodes = new Map<string, GraphNode>();

  shapes = new Map<string, Shape>();

  activeNodeId = signal<string | null>(null);

  addShape(shapeId: string, shape: Shape) {
    this.shapes.set(shapeId, shape);
  }

  loadFromStorage() {
    const serializedShapes = this.#safeParse<SerializedShape[]>(
      localStorage.getItem(this.#shapesStorageKey),
      [],
    );
    const serializedNodes = this.#safeParse<SerializedNode | null>(
      localStorage.getItem(this.#nodesStorageKey),
      null,
    );

    this.shapes = this.#deserializeShapes(serializedShapes);

    const rootNode = serializedNodes
      ? this.#deserializeNode(serializedNodes)
      : new LayerNode({});

    this.nodes.clear();
    this.#registerNodeRecursive(rootNode);
    this.nodesRoot.set(rootNode);

    if (this.nodes.has(rootNode.id)) {
      this.activeNodeId.set(rootNode.id);
      return;
    }

    this.activeNodeId.set(null);
  }

  saveToStorage() {
    if (this.persistRemoteDraft) {
      this.persistRemoteDraft();
      return;
    }
    const shapes = Array.from(this.shapes.values()).map((shape) =>
      this.#serializeShape(shape),
    );
    const nodes = this.#serializeNode(this.nodesRoot());

    localStorage.setItem(this.#shapesStorageKey, JSON.stringify(shapes));
    localStorage.setItem(this.#nodesStorageKey, JSON.stringify(nodes));
  }

  exportSnapshot(): string {
    const snapshot: WorkshopSnapshot = {
      version: 2,
      shapes: Array.from(this.shapes.values()).map((shape) =>
        this.#serializeShape(shape),
      ),
      nodes: this.#serializeNode(this.nodesRoot()),
    };
    return JSON.stringify(snapshot);
  }

  importSnapshot(raw: string) {
    const snapshot = JSON.parse(raw) as WorkshopSnapshot;
    if (
      (snapshot.version !== 1 && snapshot.version !== 2) ||
      !snapshot.nodes ||
      !snapshot.shapes
    ) {
      throw new Error('Unsupported map format');
    }

    this.shapes = this.#deserializeShapes(snapshot.shapes);
    for (const id of this.shapes.keys()) this.deletedShapeIds.delete(id);
    const root = this.#deserializeNode(snapshot.nodes);
    this.nodes.clear();
    this.#registerNodeRecursive(root);
    this.nodesRoot.set(root);
    this.activeNodeId.set(root.id);
    this.graphVersion.update((version) => version + 1);
    this.saveToStorage();
  }

  #serializeNode(node: GraphNode, childIndex = 0): SerializedNode {
    const children = node.children
      .filter(
        (child) =>
          !(child instanceof ShapeNode) || this.shapes.has(child.shape.id),
      )
      .map((child, index) => this.#serializeNode(child, index));
    const baseNode = {
      id: node.id,
      type: node.type,
      visible: node.visible,
      locked: node.locked,
      isDirty: node.isDirty,
      zIndex: node.zIndex,
      childIndex,
      children,
    };

    switch (node.type) {
      case NodesTypes.LAYER:
        return {
          ...baseNode,
          type: NodesTypes.LAYER,
          layerData: (node as LayerNode).layerData,
        };
      case NodesTypes.SHAPE:
        return {
          ...baseNode,
          type: NodesTypes.SHAPE,
          shapeId: (node as ShapeNode).shape.id,
        };
      case NodesTypes.GROUP:
      default:
        return {
          ...baseNode,
          type: NodesTypes.GROUP,
        };
    }
  }

  #deserializeNode(node: SerializedNode): GraphNode {
    let graphNode: GraphNode;

    switch (node.type) {
      case NodesTypes.LAYER:
        graphNode = new LayerNode(node.layerData);
        break;
      case NodesTypes.SHAPE:
        graphNode = new ShapeNode(
          this.shapes.get(node.shapeId) ??
            new RectangleShape({
              type: ShapesTypes.RECTANGLE,
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              fillColor: '#00000000',
              strokeColor: '#000',
              opacity: 1,
              strokeWidth: 1,
            }),
        );
        break;
      case NodesTypes.GROUP:
      default:
        graphNode = new GroupNode();
        break;
    }

    this.#setReadonlyId(graphNode, node.id);
    graphNode.visible = node.visible;
    graphNode.locked = node.locked ?? false;
    graphNode.isDirty = node.isDirty;
    graphNode.zIndex = node.zIndex;

    for (const child of node.children) {
      graphNode.addChild(this.#deserializeNode(child));
    }

    return graphNode;
  }

  #serializeShape(shape: Shape): SerializedShape {
    const baseShape = {
      id: shape.id,
      objectId: shape.objectId,
      erasures: shape.erasures,
      name: shape.name,
      type: shape.type,
      strokeColor: shape.strokeColor,
      opacity: shape.opacity,
      strokeWidth: shape.strokeWidth,
      selected: shape.selected,
      layerId: shape.layerId,
      shadowColor: shape.shadowColor,
      shadowBlur: shape.shadowBlur,
      shadowOffsetX: shape.shadowOffsetX,
      shadowOffsetY: shape.shadowOffsetY,
      minZoom: shape.minZoom,
      maxZoom: Number.isFinite(shape.maxZoom ?? Infinity)
        ? shape.maxZoom
        : undefined,
      mapObjectType: shape.mapObjectType,
    };

    switch (shape.type) {
      case ShapesTypes.TEXT: {
        const text = shape as Text;
        return {
          ...baseShape,
          type: ShapesTypes.TEXT,
          text: text.text,
          x: text.x,
          y: text.y,
          fontSize: text.fontSize,
          fontFamily: text.fontFamily,
          fillColor: text.fillColor,
        };
      }
      case ShapesTypes.STAMP: {
        const stamp = shape as StampShape;
        return {
          ...baseShape,
          type: ShapesTypes.STAMP,
          textureId: stamp.textureId,
          textureUrl: stamp.textureUrl,
          instances: stamp.instances,
        };
      }
      case ShapesTypes.LINE:
        return {
          ...baseShape,
          type: ShapesTypes.LINE,
          points: (shape as Line).points,
        };
      case ShapesTypes.RECTANGLE:
        return {
          ...baseShape,
          type: ShapesTypes.RECTANGLE,
          x: (shape as Rectangle).x,
          y: (shape as Rectangle).y,
          width: (shape as Rectangle).width,
          height: (shape as Rectangle).height,
          fillColor: (shape as Rectangle).fillColor,
        };
      case ShapesTypes.TEXTURE: {
        const texture = shape as TextureStroke;
        return {
          ...baseShape,
          type: ShapesTypes.TEXTURE,
          points: texture.points,
          textureId: texture.textureId,
          textureUrl: texture.textureUrl,
          textureScale: texture.textureScale,
          textureRotation: texture.textureRotation,
          textureColor: texture.textureColor,
        };
      }
      default:
        throw new Error(`Unsupported shape type: ${shape.type}`);
    }
  }

  #deserializeShapes(shapes: SerializedShape[]) {
    const shapesMap = new Map<string, Shape>();
    for (const record of shapes) {
      const restored = restoreSerializedShape(record);
      shapesMap.set(restored.id, restored);
    }
    return shapesMap;
  }

  #registerNodeRecursive(node: GraphNode) {
    this.nodes.set(node.id, node);

    for (const child of node.children) {
      this.#registerNodeRecursive(child);
    }
  }

  #safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  #setReadonlyId(target: { id: string }, id: string) {
    Object.defineProperty(target, 'id', {
      value: id,
      writable: false,
      configurable: true,
    });
  }

  clearStorage(): void {
    localStorage.removeItem(this.#shapesStorageKey);
    localStorage.removeItem(this.#nodesStorageKey);
    this.deletedShapeIds.clear();
    this.shapes.clear();
    this.nodes.clear();

    const rootNode = new LayerNode({});
    this.nodes.set(rootNode.id, rootNode);
    this.nodesRoot.set(rootNode);
    this.activeNodeId.set(rootNode.id);
    this.graphVersion.update((version) => version + 1);
  }

  generateRandomShapesInMemory(count = 10_000) {
    // очищаем текущие данные
    this.shapes.clear();
    this.nodes.clear();

    const rootBase = new LayerNode({});
    const mainLayer = new LayerNode({});
    rootBase.children.push(mainLayer);

    this.#setReadonlyId(mainLayer, 'root-layer');
    this.nodes.set(mainLayer.id, mainLayer);

    const canvasWidth = 1920;
    const canvasHeight = 1080;

    for (let i = 0; i < count; i++) {
      const id = `shape_${i}`;
      const isRect = true;

      let shape: Shape;

      if (isRect) {
        shape = new RectangleShape({
          type: ShapesTypes.RECTANGLE,
          x: Math.random() * canvasWidth,
          y: Math.random() * canvasHeight,
          width: 10 + Math.random() * 40,
          height: 10 + Math.random() * 40,
          fillColor:
            '#' +
            Math.floor(Math.random() * 16777215)
              .toString(16)
              .padStart(6, '0'),
          strokeColor: '#000',
          opacity: 1,
          strokeWidth: 1,
          layerId: mainLayer.id,
        });
      } else {
        shape = new LineShape({
          type: ShapesTypes.LINE,
          points: [
            { x: Math.random() * canvasWidth, y: Math.random() * canvasHeight },
            { x: Math.random() * canvasWidth, y: Math.random() * canvasHeight },
          ],
          strokeColor: '#000',
          opacity: 1,
          strokeWidth: 1,
          layerId: mainLayer.id,
        });
      }

      this.#setReadonlyId(shape, id);
      this.shapes.set(id, shape);

      const node = new ShapeNode(shape);
      this.#setReadonlyId(node, `node_${id}`);
      mainLayer.addChild(node);
      this.nodes.set(node.id, node);
    }

    this.nodesRoot.set(rootBase);
    this.activeNodeId.set(mainLayer.id);
    this.graphVersion.update((v) => v + 1);
  }
}
