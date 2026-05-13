import { Injectable, signal } from '@angular/core';
import { NodesTypes, ShapesTypes } from '../consts';
import { GraphNode, GroupNode, LayerNode, ShapeNode } from '../nodes';
import { Line, LineShape, Rectangle, RectangleShape, Shape } from '../shapes';

interface SerializedBaseNode {
  id: string;
  type: NodesTypes;
  visible: boolean;
  isDirty: boolean;
  zIndex: number;
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

type SerializedNode =
  | SerializedLayerNode
  | SerializedGroupNode
  | SerializedShapeNode;

interface SerializedBaseShape {
  id: string;
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

type SerializedShape = SerializedLineShape | SerializedRectangleShape;

@Injectable()
export class WorkshopSceneGraphStorageService {
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
    const shapes = Array.from(this.shapes.values()).map((shape) =>
      this.#serializeShape(shape),
    );
    const nodes = this.#serializeNode(this.nodesRoot());

    localStorage.setItem(this.#shapesStorageKey, JSON.stringify(shapes));
    localStorage.setItem(this.#nodesStorageKey, JSON.stringify(nodes));
  }

  #serializeNode(node: GraphNode): SerializedNode {
    const children = node.children.map((child) => this.#serializeNode(child));
    const baseNode = {
      id: node.id,
      type: node.type,
      visible: node.visible,
      isDirty: node.isDirty,
      zIndex: node.zIndex,
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
    };

    switch (shape.type) {
      case ShapesTypes.LINE:
        return {
          ...baseShape,
          type: ShapesTypes.LINE,
          points: (shape as Line).points,
        };
      case ShapesTypes.RECTANGLE:
      default:
        return {
          ...baseShape,
          type: ShapesTypes.RECTANGLE,
          x: (shape as Rectangle).x,
          y: (shape as Rectangle).y,
          width: (shape as Rectangle).width,
          height: (shape as Rectangle).height,
          fillColor: (shape as Rectangle).fillColor,
        };
    }
  }

  #deserializeShapes(shapes: SerializedShape[]) {
    const shapesMap = new Map<string, Shape>();

    for (const shape of shapes) {
      let restoredShape: Shape | null = null;

      switch (shape.type) {
        case ShapesTypes.LINE:
          restoredShape = new LineShape({
            type: ShapesTypes.LINE,
            points: shape.points,
            strokeColor: shape.strokeColor,
            opacity: shape.opacity,
            strokeWidth: shape.strokeWidth,
            layerId: shape.layerId,
            shadowColor: shape.shadowColor,
            shadowBlur: shape.shadowBlur,
            shadowOffsetX: shape.shadowOffsetX,
            shadowOffsetY: shape.shadowOffsetY,
          });
          break;
        case ShapesTypes.RECTANGLE:
          restoredShape = new RectangleShape({
            type: ShapesTypes.RECTANGLE,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            fillColor: shape.fillColor,
            strokeColor: shape.strokeColor,
            opacity: shape.opacity,
            strokeWidth: shape.strokeWidth,
            layerId: shape.layerId,
            shadowColor: shape.shadowColor,
            shadowBlur: shape.shadowBlur,
            shadowOffsetX: shape.shadowOffsetX,
            shadowOffsetY: shape.shadowOffsetY,
          });
          break;
        default:
          break;
      }

      if (!restoredShape) continue;

      this.#setReadonlyId(restoredShape, shape.id);
      restoredShape.selected = shape.selected;
      restoredShape.layerId = shape.layerId;
      restoredShape.shadowColor = shape.shadowColor;
      restoredShape.shadowBlur = shape.shadowBlur;
      restoredShape.shadowOffsetX = shape.shadowOffsetX;
      restoredShape.shadowOffsetY = shape.shadowOffsetY;
      shapesMap.set(restoredShape.id, restoredShape);
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
    this.shapes.clear();
    this.nodes.clear();
    this.nodesRoot.set(new LayerNode({}));
    console.log('Storage очищен');
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
