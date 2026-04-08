import { inject, Injectable } from '@angular/core';
import { LineShape, RectangleShape, Shape } from '../shapes';
import { debounceTime, interval, merge, of, Subject, switchMap } from 'rxjs';
import { ShapesData } from '../interfaces';
import { isLine, isRectangle } from '../guards';
import { WorkshopShapesStorageService } from './workshop-shapes-storage.service';
import { GraphNode, LayerNode, ShapeNode } from '../nodes';
import { NodesTypes } from '../consts';

@Injectable()
export class WorkshopShapesService {
  #shapesStorageService = inject(WorkshopShapesStorageService);

  rootNode = this.#shapesStorageService.rootNode;
  nodes = this.#shapesStorageService.nodes;

  activeLayerId = this.#shapesStorageService.activeLayerId;
  activeShapeId = this.#shapesStorageService.activeShapeId;

  #nodesChanges$ = new Subject<void>();

  #autoSavesInterval$ = interval(60000);
  #savesDebounceTime = 1;

  nodesSaves$ = merge(this.#nodesChanges$, this.#autoSavesInterval$).pipe(
    debounceTime(this.#savesDebounceTime),
    switchMap(() => {
      return this.#sendNodes();
    }),
  );

  getNodes() {
    const shapes = localStorage.getItem('shapes');
    const layers = localStorage.getItem('layers');

    if (!shapes || !layers) return of({});

    try {
      const parsedShapes = JSON.parse(shapes) as ShapesData[];
      const parsedLayers = JSON.parse(layers) as LayerNode[];

      this.nodes.set(
        this.#buildNodesGraph({
          shapes: parsedShapes,
          layers: parsedLayers,
        }),
      );

      return of({});
    } catch {
      return of({});
    }
  }

  saveNodes() {
    this.#nodesChanges$.next();
  }

  addShape(shape: Shape) {
    console.log(this.activeLayerId(), this.rootNode(), this.nodes());
    const layer = this.nodes()[this.activeLayerId() ?? this.rootNode().id];

    // layer.addChild(new ShapeNode(shape));
    // shape.layerId =
    //   this.activeLayerId() ?? Object.values(this.defaultLayer ?? {})[0].id;
    //
    // this.shapes.update((shapes) => [...shapes, shape]);

    this.saveNodes();
  }

  deleteShapes() {
    // this.nodes.update((shapes) => {
    //   return shapes.filter((shape) => !shape.selected);
    // });

    this.saveNodes();
  }

  setActiveLayer(layerId: string) {
    console.log('set active layer');
  }

  addLayer(name?: string) {
    this.saveNodes();
  }

  removeLayer(layerId: string) {
    console.log('remove');
  }

  toggleLayerVisibility(layerId: string) {
    console.log('toggle visibility');
  }

  renameLayer(layerId: string, name: string) {
    console.log('rename');
  }

  moveLayerUp(layerId: string) {
    console.log('move up');
  }

  moveLayerDown(layerId: string) {
    console.log('move down');
  }

  reorderLayer(sourceId: string, targetId: string) {
    console.log('reorder');
  }

  #sendNodes() {
    const layers: LayerNode[] = [];
    const shapes: ShapesData[] = [];

    const root = this.rootNode();

    root.traverse((node) => {
      if (node === root) return;

      if (node.type === NodesTypes.LAYER) {
        const layerNode = node as LayerNode;

        const parentLayer =
          layerNode.parent && layerNode.parent.type === NodesTypes.LAYER
            ? (layerNode.parent as LayerNode)
            : null;

        const layerDto: any = {
          id: layerNode.id,
          parent: parentLayer
            ? {
                id: parentLayer.id,
                parent: null,
                zIndex: parentLayer.zIndex ?? 0,
              } // можно упростить до { id: parentLayer.id }
            : null,
          zIndex: layerNode.zIndex,
        };

        layers.push(layerDto);
      }

      if (node.type === NodesTypes.SHAPE) {
        const shapeNode = node as ShapeNode;

        // вытаскиваем ShapesData из конкретного shape
        const shape = shapeNode.shape;
        let dto: ShapesData | null = null;

        if (shape instanceof LineShape) {
          dto = shape; // или shape.data, как у тебя
        } else if (shape instanceof RectangleShape) {
          dto = shape;
        }

        if (dto) {
          shapes.push(dto);
        }
      }
    });

    try {
      localStorage.setItem('shapes', JSON.stringify(shapes));
      localStorage.setItem('layers', JSON.stringify(layers));
    } catch {
      of({});
    }

    return of({});
  }

  isShapeVisible(shape: Shape) {
    return true;
  }

  #buildNodesGraph(nodes: { shapes: ShapesData[]; layers: LayerNode[] }) {
    const result: Record<string, GraphNode> = {};

    for (const layerDto of nodes.layers) {
      const layer = new LayerNode();
      result[layer.id] = layer;
    }

    // 2. строим иерархию слоёв
    for (const layerDto of nodes.layers) {
      const layer = result[layerDto.id] as LayerNode;
      if (layerDto.parent) {
        const parent = result[layerDto.parent.id] as LayerNode;
        if (parent && parent.type === NodesTypes.LAYER) {
          parent.addChild(layer);
        }
      }
    }

    // 3. создаём инстансы фигур и вешаем их в слои
    for (const shapeDto of nodes.shapes) {
      let shape: ShapeNode | null = null;

      if (isLine(shapeDto)) {
        shape = new ShapeNode(new LineShape(shapeDto));
      } else if (isRectangle(shapeDto)) {
        shape = new ShapeNode(new RectangleShape(shapeDto));
      }

      if (!shape) return {};

      const parent = result[this.rootNode().id];
      if (parent && parent.type === NodesTypes.LAYER) {
        parent.addChild(shape);
      }
      result[shape.id] = shape;
    }

    this.activeLayerId.set(this.rootNode().id);

    return result ?? {};
  }
}
