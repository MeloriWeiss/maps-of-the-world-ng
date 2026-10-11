import {
  intersectsBounds,
  mapChunkSize,
  WorldBounds,
} from '@wm/shared/workshop';
import { GraphNode, ShapeNode } from '../nodes';
import { Shape } from '../shapes';

interface Tile {
  canvas: HTMLCanvasElement;
}

/** Disposable raster cache. Geometry and original assets remain the source of truth. */
export class ChunkRenderer {
  #version = -1;
  #ordered: Shape[] = [];
  #order = new Map<Shape, number>();
  #spatial = new Map<string, Shape[]>();
  #largeShapes: Shape[] = [];
  #tiles = new Map<string, Tile>();
  #maxTiles = 96;

  render(
    ctx: CanvasRenderingContext2D,
    root: GraphNode,
    viewport: WorldBounds,
    zoom: number,
    version: number,
    overviewAt: (bounds: WorldBounds) => boolean,
    ready: (bounds: WorldBounds) => boolean,
    schedule: () => void,
  ) {
    if (this.#version !== version) {
      this.#version = version;
      this.#tiles.clear();
      this.#ordered = [];
      this.#order.clear();
      this.#spatial.clear();
      this.#largeShapes = [];
      const visit = (node: GraphNode) => {
        if (!node.visible) return;
        if (node instanceof ShapeNode) {
          this.#order.set(node.shape, this.#ordered.length);
          this.#ordered.push(node.shape);
          return;
        }
        for (const child of [...node.children].sort(
          (a, b) => a.zIndex - b.zIndex,
        ))
          visit(child);
      };
      visit(root);
      for (const shape of this.#ordered) {
        const bounds = shape.getBounds();
        const left = Math.floor(bounds.x / mapChunkSize),
          top = Math.floor(bounds.y / mapChunkSize);
        const right = Math.floor((bounds.x + bounds.width) / mapChunkSize),
          bottom = Math.floor((bounds.y + bounds.height) / mapChunkSize);
        if ((right - left + 1) * (bottom - top + 1) > 64) {
          this.#largeShapes.push(shape);
          continue;
        }
        for (let y = top; y <= bottom; y++)
          for (let x = left; x <= right; x++) {
            const key = `${x}:${y}`,
              bucket = this.#spatial.get(key) ?? [];
            bucket.push(shape);
            this.#spatial.set(key, bucket);
          }
      }
    }
    const level = Math.ceil(Math.log2(Math.max(zoom, 0.001)));
    const scale = 2 ** level;
    const size = 512 / scale;
    const startX = Math.floor(viewport.x / size),
      endX = Math.floor((viewport.x + viewport.width) / size);
    const startY = Math.floor(viewport.y / size),
      endY = Math.floor((viewport.y + viewport.height) / size);
    const start = performance.now();
    let pending = false;
    for (let y = startY; y <= endY; y++)
      for (let x = startX; x <= endX; x++) {
        const bounds = { x: x * size, y: y * size, width: size, height: size };
        const hasOverview = overviewAt(bounds);
        if (!ready(bounds)) {
          if (!hasOverview) this.#direct(ctx, bounds, zoom);
          continue;
        }
        const key = `${level}:${x}:${y}`;
        let tile = this.#tiles.get(key);
        if (!tile && performance.now() - start < 8) {
          tile = this.#create(bounds, scale, zoom);
          this.#tiles.set(key, tile);
        }
        if (!tile) {
          // Local edits can always render from geometry while their cache is rebuilt.
          if (!hasOverview) this.#direct(ctx, bounds, zoom);
          pending = true;
          continue;
        }
        this.#tiles.delete(key);
        this.#tiles.set(key, tile);
        this.#drawTile(ctx, tile.canvas, bounds);
      }
    while (this.#tiles.size > this.#maxTiles) {
      const key = this.#tiles.keys().next().value;
      if (key === undefined) break;
      this.#tiles.delete(key);
    }
    if (pending) schedule();
  }

  #drawTile(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    bounds: WorldBounds,
  ) {
    // Adjacent destination rectangles must share the same device-pixel edge.
    // Fractional world coordinates leave thin background seams across shapes.
    const transform = ctx.getTransform();
    const left = Math.round(bounds.x * transform.a + transform.e);
    const top = Math.round(bounds.y * transform.d + transform.f);
    const right = Math.round(
      (bounds.x + bounds.width) * transform.a + transform.e,
    );
    const bottom = Math.round(
      (bounds.y + bounds.height) * transform.d + transform.f,
    );
    if (right <= left || bottom <= top) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(left, top, right - left, bottom - top);
    ctx.drawImage(
      canvas,
      1,
      1,
      512,
      512,
      left,
      top,
      right - left,
      bottom - top,
    );
    ctx.restore();
  }

  #create(bounds: WorldBounds, scale: number, zoom: number): Tile {
    const canvas = document.createElement('canvas');
    canvas.width = 514;
    canvas.height = 514;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(
        scale,
        0,
        0,
        scale,
        1 - bounds.x * scale,
        1 - bounds.y * scale,
      );
      this.#draw(
        ctx,
        {
          x: bounds.x - 1 / scale,
          y: bounds.y - 1 / scale,
          width: bounds.width + 2 / scale,
          height: bounds.height + 2 / scale,
        },
        zoom,
      );
    }
    return { canvas };
  }

  #direct(ctx: CanvasRenderingContext2D, bounds: WorldBounds, zoom: number) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();
    this.#draw(ctx, bounds, zoom);
    ctx.restore();
  }

  #draw(ctx: CanvasRenderingContext2D, bounds: WorldBounds, zoom: number) {
    const candidates = new Set(this.#largeShapes);
    const left = Math.floor(bounds.x / mapChunkSize),
      top = Math.floor(bounds.y / mapChunkSize);
    const right = Math.floor((bounds.x + bounds.width) / mapChunkSize),
      bottom = Math.floor((bounds.y + bounds.height) / mapChunkSize);
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        for (const shape of this.#spatial.get(`${x}:${y}`) ?? [])
          candidates.add(shape);
      }
    for (const shape of [...candidates].sort(
      (a, b) => (this.#order.get(a) ?? 0) - (this.#order.get(b) ?? 0),
    )) {
      if (!intersectsBounds(shape.getBounds(), bounds)) continue;
      const min = shape.minZoom ?? 0,
        max = shape.maxZoom ?? Infinity;
      const lower =
        min > 0 ? Math.max(0, Math.min(1, (zoom / min - 0.8) / 0.4)) : 1;
      const upper = Number.isFinite(max)
        ? Math.max(0, Math.min(1, (1.2 - zoom / max) / 0.4))
        : 1;
      if (!lower || !upper) continue;
      ctx.save();
      ctx.globalAlpha = lower * upper;
      shape.render(ctx);
      ctx.restore();
    }
  }
}
