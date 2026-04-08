import { inject, Injectable } from '@angular/core';
import { WorkshopShapesStorageService } from '../services';
import { Bounds, QuadtreeItem, QuadtreeNode } from '../interfaces';

@Injectable()
export class WorkshopQuadtreeService {
  // #shapesStorageService = inject(WorkshopShapesStorageService);

  root: QuadtreeNode = {
    bounds: { x: -5000, y: -5000, width: 10000, height: 10000 },
    items: [],
    nodes: [],
    maxItems: 4,
    maxDepth: 7,
    depth: 0,
  };

  // shapes = this.#shapesStorageService.shapes;

  constructor() {
    // effect(() => {
    //   this.shapes();
    this.rebuildQuadtree();
    // });
  }

  clear() {
    this.root.items = [];
    this.root.nodes = [];
  }

  insert(item: QuadtreeItem) {
    this.expandToFit(item.bounds);
    this._insert(this.root, item);
  }

  expandToFit(itemBounds: Bounds) {
    while (!this.intersects(this.root.bounds, itemBounds)) {
      const old = this.root;
      const rb = old.bounds;

      // Увеличиваем мир в 2 раза, выбирая квадрант, где был старый root
      const newBounds = {
        x: rb.x - rb.width / 2,
        y: rb.y - rb.height / 2,
        width: rb.width * 2,
        height: rb.height * 2,
      };

      this.root = {
        bounds: newBounds,
        items: [],
        nodes: [old], // старый root становится ребёнком
        maxItems: old.maxItems,
        maxDepth: old.maxDepth,
        depth: 0,
      };
    }
  }

  private _insert(node: QuadtreeNode, item: QuadtreeItem) {
    if (!this.intersects(node.bounds, item.bounds)) return;

    // Если достигли maxDepth — дальше НЕ делимся, просто копим здесь
    if (node.depth >= node.maxDepth) {
      node.items.push(item);
      return;
    }

    // Если ещё есть место в узле — складываем сюда
    if (node.items.length < node.maxItems && node.nodes.length === 0) {
      node.items.push(item);
      return;
    }

    // Иначе — subdivide (если ещё не делали) и раскидать всё по детям
    if (node.nodes.length === 0) {
      this._subdivide(node);

      // ВАЖНО: старые items тоже спускаем в детей
      const oldItems = node.items;
      node.items = [];
      for (const old of oldItems) {
        for (const child of node.nodes) {
          this._insert(child, old);
        }
      }
    }

    // Вставляем текущий item в детей
    for (const child of node.nodes) {
      this._insert(child, item);
    }
  }

  retrieve(queryBounds: Bounds): QuadtreeItem[] {
    return this._retrieve(this.root, queryBounds);
  }

  private _retrieve(node: QuadtreeNode, queryBounds: Bounds): QuadtreeItem[] {
    const result: QuadtreeItem[] = [];

    if (!this.intersects(node.bounds, queryBounds)) return result;

    // Добавляем items узла
    node.items.forEach((item) => {
      if (this.intersects(item.bounds, queryBounds)) {
        result.push(item);
      }
    });

    // Рекурсия в дочерние
    node.nodes.forEach((child) => {
      result.push(...this._retrieve(child, queryBounds));
    });

    return result;
  }

  private _subdivide(node: QuadtreeNode) {
    const { x, y, width, height } = node.bounds;
    const w = width / 2;
    const h = height / 2;

    node.nodes = [
      // NW, NE, SW, SE
      {
        bounds: { x, y, width: w, height: h },
        items: [],
        nodes: [],
        maxItems: node.maxItems,
        maxDepth: node.maxDepth,
        depth: node.depth + 1,
      },
      {
        bounds: { x: x + w, y, width: w, height: h },
        items: [],
        nodes: [],
        maxItems: node.maxItems,
        maxDepth: node.maxDepth,
        depth: node.depth + 1,
      },
      {
        bounds: { x, y: y + h, width: w, height: h },
        items: [],
        nodes: [],
        maxItems: node.maxItems,
        maxDepth: node.maxDepth,
        depth: node.depth + 1,
      },
      {
        bounds: { x: x + w, y: y + h, width: w, height: h },
        items: [],
        nodes: [],
        maxItems: node.maxItems,
        maxDepth: node.maxDepth,
        depth: node.depth + 1,
      },
    ];
  }

  intersects(shapeBounds: Bounds, viewport: Bounds) {
    return !(
      shapeBounds.x + shapeBounds.width < viewport.x ||
      shapeBounds.x > viewport.x + viewport.width ||
      shapeBounds.y + shapeBounds.height < viewport.y ||
      shapeBounds.y > viewport.y + viewport.height
    );
  }

  rebuildQuadtree() {
    // const shapes = this.shapes();
    // if (!shapes.length) return;
    //
    // const xs = shapes.map((s) => s.getBounds().x);
    // const ys = shapes.map((s) => s.getBounds().y);
    // const ws = shapes.map((s) => s.getBounds().x + s.getBounds().width);
    // const hs = shapes.map((s) => s.getBounds().y + s.getBounds().height);
    //
    // const minX = Math.min(...xs);
    // const minY = Math.min(...ys);
    // const maxX = Math.max(...ws);
    // const maxY = Math.max(...hs);
    //
    // this.root.bounds = {
    //   x: minX,
    //   y: minY,
    //   width: maxX - minX,
    //   height: maxY - minY,
    // };
    //
    // this.clear();
    // this.shapes().forEach((shape) => {
    //   const bounds = shape.getBounds();
    //   this.insert({ bounds, data: shape });
    // });
  }
}
