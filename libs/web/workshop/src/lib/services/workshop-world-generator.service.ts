import { inject, Injectable } from '@angular/core';
import { ShapesTypes } from '../consts';
import { LayerNode, ShapeNode } from '../nodes';
import { LineShape, RectangleShape, Shape } from '../shapes';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';

export interface GeneratedWorldSummary {
  seed: string;
  objects: number;
}

@Injectable()
export class WorkshopWorldGeneratorService {
  #storage = inject(WorkshopSceneGraphStorageService);
  #canvasManager = inject(WorkshopCanvasManagerService);

  generate(seed = crypto.randomUUID().slice(0, 8)): GeneratedWorldSummary {
    const random = mulberry32(hashSeed(seed));
    const root = new LayerNode({ name: 'Generated world' });
    const terrain = new LayerNode({ name: 'Continents and water' });
    const geography = new LayerNode({ name: 'Rivers and mountains' });
    const settlements = new LayerNode({ name: 'Settlements' });
    const interiors = new LayerNode({ name: 'Interiors' });

    root.addChild(terrain);
    root.addChild(geography);
    root.addChild(settlements);
    root.addChild(interiors);
    this.#storage.shapes.clear();
    this.#storage.nodes.clear();
    [root, terrain, geography, settlements, interiors].forEach((node) =>
      this.#storage.nodes.set(node.id, node),
    );

    for (let index = 0; index < 14; index++) {
      this.#addRectangle(terrain, 'continent', 0, 0.75, {
        x: between(random, -24_000, 18_000),
        y: between(random, -16_000, 12_000),
        width: between(random, 4_000, 11_000),
        height: between(random, 3_000, 8_000),
        fillColor: pick(random, ['#8ea66c', '#a9b77d', '#7e9565']),
        strokeColor: '#61734d',
        strokeWidth: 50,
      });
    }

    for (let index = 0; index < 45; index++) {
      const x = between(random, -22_000, 22_000);
      const y = between(random, -14_000, 14_000);
      const points = Array.from({ length: 8 }, (_, pointIndex) => ({
        x: x + pointIndex * between(random, 120, 320),
        y: y + Math.sin(pointIndex * 1.2) * between(random, 100, 450),
      }));
      this.#addLine(geography, points, 'river', 0.2, 2.5, {
        strokeColor: '#4b8ca8',
        strokeWidth: between(random, 18, 55),
      });
    }

    for (let index = 0; index < 500; index++) {
      const size = between(random, 45, 150);
      this.#addRectangle(geography, 'mountain', 0.28, 3, {
        x: between(random, -23_000, 23_000),
        y: between(random, -15_000, 15_000),
        width: size,
        height: size,
        fillColor: pick(random, ['#77746c', '#8b877e', '#696761']),
        strokeColor: '#504e49',
        strokeWidth: 5,
      });
    }

    for (let town = 0; town < 22; town++) {
      const centerX = between(random, -20_000, 20_000);
      const centerY = between(random, -13_000, 13_000);
      const houseCount = Math.floor(between(random, 12, 28));

      for (let house = 0; house < houseCount; house++) {
        const x = centerX + between(random, -900, 900);
        const y = centerY + between(random, -700, 700);
        const width = between(random, 90, 220);
        const height = between(random, 80, 190);
        this.#addRectangle(settlements, 'house', 0.65, Infinity, {
          x,
          y,
          width,
          height,
          fillColor: pick(random, ['#b88b62', '#9e7352', '#c39a73']),
          strokeColor: '#624b3a',
          strokeWidth: 8,
        });

        const furnitureCount = Math.floor(between(random, 2, 6));
        for (let item = 0; item < furnitureCount; item++) {
          this.#addRectangle(
            interiors,
            pick(random, ['table', 'wardrobe', 'bed', 'chair']),
            2.1,
            Infinity,
            {
              x: x + between(random, 10, Math.max(11, width - 35)),
              y: y + between(random, 10, Math.max(11, height - 30)),
              width: between(random, 12, 35),
              height: between(random, 10, 28),
              fillColor: pick(random, ['#5d4433', '#765944', '#927057']),
              strokeColor: '#3b2c22',
              strokeWidth: 2,
            },
          );
        }
      }
    }

    this.#storage.nodesRoot.set(root);
    this.#storage.activeNodeId.set(settlements.id);
    this.#storage.graphVersion.update((version) => version + 1);
    this.#storage.saveToStorage();
    this.#canvasManager.requestRedraw();
    return { seed, objects: this.#storage.shapes.size };
  }

  #addRectangle(
    layer: LayerNode,
    type: string,
    minZoom: number,
    maxZoom: number,
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
      fillColor: string;
      strokeColor: string;
      strokeWidth: number;
    },
  ) {
    const shape = new RectangleShape({
      type: ShapesTypes.RECTANGLE,
      opacity: 1,
      ...rect,
    });
    this.#addShape(layer, shape, type, minZoom, maxZoom);
  }

  #addLine(
    layer: LayerNode,
    points: { x: number; y: number }[],
    type: string,
    minZoom: number,
    maxZoom: number,
    style: { strokeColor: string; strokeWidth: number },
  ) {
    const shape = new LineShape({
      type: ShapesTypes.LINE,
      points,
      opacity: 0.9,
      ...style,
    });
    this.#addShape(layer, shape, type, minZoom, maxZoom);
  }

  #addShape(
    layer: LayerNode,
    shape: Shape,
    type: string,
    minZoom: number,
    maxZoom: number,
  ) {
    shape.layerId = layer.id;
    shape.minZoom = minZoom;
    shape.maxZoom = maxZoom;
    shape.mapObjectType = type;
    const node = new ShapeNode(shape);
    layer.addChild(node);
    this.#storage.shapes.set(shape.id, shape);
    this.#storage.nodes.set(node.id, node);
  }
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function between(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function pick<T>(random: () => number, values: readonly T[]) {
  return values[Math.floor(random() * values.length)];
}
