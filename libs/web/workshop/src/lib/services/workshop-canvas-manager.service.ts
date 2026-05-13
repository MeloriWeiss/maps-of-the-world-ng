import { inject, Injectable, signal } from '@angular/core';
import { WorkshopCanvasService } from './workshop-canvas.service';
import { WorkshopCoordsService } from './workshop-coords.service';
import { fromEvent } from 'rxjs';
import { WorkshopShapesService } from './workshop-shapes.service';
import { Bounds } from '../interfaces';
import { GraphNode, LayerNode, ShapeNode } from '../nodes';
import { NodesTypes } from '../consts';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';

@Injectable()
export class WorkshopCanvasManagerService {
  #workshopCanvasService = inject(WorkshopCanvasService);
  #workshopShapesService = inject(WorkshopShapesService);
  #workshopSceneGraphStorageService = inject(WorkshopSceneGraphStorageService);
  #workshopCoordsService = inject(WorkshopCoordsService);
  #rootNode = this.#workshopSceneGraphStorageService.nodesRoot;

  useOffscreen = signal(false);

  #frameScheduled = false;
  #dirtyForRedraw = false;

  stats_renderedNodesLastFrame = 0; // всего отрисовано
  stats_culledNodesLastFrame = 0; // отсечено по viewport
  stats_totalNodesLastFrame = 0; // всего обойдено в дереве

  clearCanvas() {
    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;

    this.#workshopCanvasService.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.#workshopCanvasService.ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  redraw() {
    // сброс статистики
    this.stats_renderedNodesLastFrame = 0;
    this.stats_culledNodesLastFrame = 0;
    this.stats_totalNodesLastFrame = 0;

    const ctx = this.#workshopCanvasService.ctx;

    this.clearCanvas();

    const zoom = this.#workshopCoordsService.zoom;

    ctx.translate(
      -this.#workshopCoordsService.cameraX,
      -this.#workshopCoordsService.cameraY,
    );
    ctx.scale(zoom, zoom);

    const t0 = performance.now();
    this.render();
    const t1 = performance.now();

    console.log(
      `[FRAME] time=${(t1 - t0).toFixed(2)}ms ` +
        `total=${this.stats_totalNodesLastFrame} ` +
        `rendered=${this.stats_renderedNodesLastFrame} ` +
        `culled=${this.stats_culledNodesLastFrame}`,
    );
  }

  render() {
    const ctx = this.#workshopCanvasService.ctx;
    const zoom = this.#workshopCoordsService.zoom;
    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;
    const viewport = this.#workshopCoordsService.worldViewport;

    // canvas background
    ctx.fillStyle = 'lightgray';
    ctx.fillRect(-1000, -1000, 2000, 2000); // пример фона
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1 / zoom;
    for (let x = -1000; x <= 1000; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, -1000);
      ctx.lineTo(x, 1000);
      ctx.stroke();
    }
    for (let y = -1000; y <= 1000; y += 100) {
      ctx.beginPath();
      ctx.moveTo(-1000, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
    this.#drawGraph(
      ctx,
      this.#rootNode(),
      viewport,
      zoom,
      canvas.width,
      canvas.height,
    );
  }

  requestRedraw() {
    this.#dirtyForRedraw = true;

    if (this.#frameScheduled) return;
    this.#frameScheduled = true;

    requestAnimationFrame(() => {
      this.#frameScheduled = false;

      if (!this.#dirtyForRedraw) return;
      this.#dirtyForRedraw = false;

      this.redraw();
    });
  }

  listenKeyEvents() {
    return fromEvent<KeyboardEvent, void>(document.body, 'keydown', (e) => {
      if (e.key === 'Delete') {
        this.#workshopShapesService.deleteSelectedShapes();
      }
      this.redraw();
    });
  }

  #drawGraph(
    mainCtx: CanvasRenderingContext2D,
    rootNode: GraphNode,
    viewport: Bounds,
    zoom: number,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    const sortedChildren = [...rootNode.children].sort(
      (a, b) => a.zIndex - b.zIndex,
    );

    for (const node of sortedChildren) {
      if (!node.visible) continue;

      if (node.type === NodesTypes.LAYER) {
        this.#renderLayer(
          mainCtx,
          node as LayerNode,
          viewport,
          zoom,
          canvasWidth,
          canvasHeight,
        );
      } else {
        this.#drawNodeDirect(mainCtx, node, viewport);
      }
    }
  }

  // метод для использования offscreen canvas при панорамировании/зуме
  // #renderLayer(
  //   mainCtx: CanvasRenderingContext2D,
  //   layer: LayerNode,
  //   viewport: Bounds, // world-viewport
  //   zoom: number,
  //   canvasWidth: number,
  //   canvasHeight: number,
  // ) {
  //   const key = `${canvasWidth}:${canvasHeight}`; // без камеры/zoom
  //   const offscreen = this.#ensureLayerOffscreen(layer, canvasWidth, canvasHeight);
  //   const offscreenCtx = layer.offscreenCtx;
  //   if (!offscreenCtx) return;
  //
  //   if (layer.isDirty || layer.offscreenKey !== key) {
  //     offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
  //     offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  //
  //     // ВАЖНО: здесь НЕ применяем camera/zoom
  //     const sortedChildren = [...layer.children].sort((a, b) => a.zIndex - b.zIndex);
  //     for (const child of sortedChildren) {
  //       if (!child.visible) continue;
  //       // Куллинг по world-viewport
  //       this.#drawNodeDirect(offscreenCtx, child, viewport);
  //     }
  //
  //     layer.isDirty = false;
  //     layer.offscreenKey = key;
  //   }
  //
  //   // Применяем камеру/zoom при копировании
  //   mainCtx.save();
  //   mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  //   mainCtx.translate(-this.#workshopCoordsService.cameraX, -this.#workshopCoordsService.cameraY);
  //   mainCtx.scale(zoom, zoom);
  //   mainCtx.drawImage(offscreen as CanvasImageSource, 0, 0);
  //   mainCtx.restore();
  // }

  // метод для НЕ использования offscreen canvas при панорамировании/зуме
  #renderLayer(
    mainCtx: CanvasRenderingContext2D,
    layer: LayerNode,
    viewport: Bounds,
    zoom: number,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    if (this.useOffscreen()) {
      const key = `${canvasWidth}:${canvasHeight}`; // без камеры/zoom
      const offscreen = this.#ensureLayerOffscreen(
        layer,
        canvasWidth,
        canvasHeight,
      );
      const offscreenCtx = layer.offscreenCtx;
      if (!offscreenCtx) return;

      if (layer.isDirty || layer.offscreenKey !== key) {
        offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
        offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        // ВАЖНО: здесь НЕ применяем camera/zoom
        const sortedChildren = [...layer.children].sort(
          (a, b) => a.zIndex - b.zIndex,
        );
        for (const child of sortedChildren) {
          if (!child.visible) continue;
          // Куллинг по world-viewport
          this.#drawNodeDirect(offscreenCtx, child, viewport);
        }

        layer.isDirty = false;
        layer.offscreenKey = key;
      }

      // Применяем камеру/zoom при копировании
      mainCtx.save();
      mainCtx.setTransform(1, 0, 0, 1, 0, 0);
      mainCtx.translate(
        -this.#workshopCoordsService.cameraX,
        -this.#workshopCoordsService.cameraY,
      );
      mainCtx.scale(zoom, zoom);
      mainCtx.drawImage(offscreen as CanvasImageSource, 0, 0);
      mainCtx.restore();
      return;
    }

    // ключ для использования offscreen canvas при панорамировании/зуме
    // const key = `${viewport.x}:${viewport.y}:${viewport.width}:${viewport.height}:${zoom}:${canvasWidth}:${canvasHeight}`;
    // метод для НЕ использования offscreen canvas при панорамировании/зуме
    const key = `${viewport.x}:${viewport.y}:${viewport.width}:${viewport.height}:${zoom}:${canvasWidth}:${canvasHeight}`;
    const offscreen = this.#ensureLayerOffscreen(
      layer,
      canvasWidth,
      canvasHeight,
    );
    const offscreenCtx = layer.offscreenCtx;

    if (!offscreenCtx) return;

    // stats
    const needRedraw = layer.isDirty || layer.offscreenKey !== key;
    if (needRedraw) {
      console.log('[LAYER REDRAW]', layer.id);
    } else {
      console.log('[LAYER CACHE HIT]', layer.id);
    }
    // end stats

    if (layer.isDirty || layer.offscreenKey !== key) {
      offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
      offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      offscreenCtx.translate(
        -this.#workshopCoordsService.cameraX,
        -this.#workshopCoordsService.cameraY,
      );
      offscreenCtx.scale(zoom, zoom);

      const sortedChildren = [...layer.children].sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      for (const child of sortedChildren) {
        if (!child.visible) continue;
        this.#drawNodeDirect(offscreenCtx, child, viewport);
      }

      layer.isDirty = false;
      layer.offscreenKey = key;
    }

    // Offscreen already contains camera/zoom transformed pixels.
    // Draw it in screen space to avoid double transform on pan/zoom.
    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.drawImage(offscreen as CanvasImageSource, 0, 0);
    mainCtx.restore();
  }

  #ensureLayerOffscreen(layer: LayerNode, width: number, height: number) {
    if (layer.offscreen && layer.offscreenCtx) {
      if (layer.offscreen instanceof HTMLCanvasElement) {
        if (
          layer.offscreen.width !== width ||
          layer.offscreen.height !== height
        ) {
          layer.offscreen.width = width;
          layer.offscreen.height = height;
          layer.isDirty = true;
        }
      } else if (
        layer.offscreen.width !== width ||
        layer.offscreen.height !== height
      ) {
        layer.offscreen = new OffscreenCanvas(width, height);
        layer.offscreenCtx = layer.offscreen.getContext('2d');
        layer.isDirty = true;
      }

      return layer.offscreen;
    }

    if (typeof OffscreenCanvas !== 'undefined') {
      layer.offscreen = new OffscreenCanvas(width, height);
      layer.offscreenCtx = layer.offscreen.getContext('2d');
      return layer.offscreen;
    }

    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = width;
    fallbackCanvas.height = height;
    layer.offscreen = fallbackCanvas;
    layer.offscreenCtx = fallbackCanvas.getContext('2d');
    return layer.offscreen;
  }

  // метод для НЕ использования offscreen canvas при панорамировании/зуме
  // добавляет куллинг
  #drawNodeDirect(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    node: GraphNode,
    viewport: Bounds,
  ) {
    if (this.useOffscreen()) {
      if (!node.visible) return;

      if (node.type === NodesTypes.SHAPE) {
        const shapeNode = node as ShapeNode;
        // БЕЗ куллинга: всегда рисуем
        shapeNode.shape.draw(ctx as CanvasRenderingContext2D);
        return;
      }

      const sortedChildren = [...node.children].sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      for (const child of sortedChildren) {
        this.#drawNodeDirect(ctx, child, viewport);
      }
      return;
    }

    this.stats_totalNodesLastFrame++;

    if (!node.visible) return;

    if (node.type === NodesTypes.SHAPE) {
      const shapeNode = node as ShapeNode;
      if (this.#intersects(shapeNode.shape.getBounds(), viewport)) {
        this.stats_renderedNodesLastFrame++;
        shapeNode.shape.draw(ctx as CanvasRenderingContext2D);
      } else {
        this.stats_culledNodesLastFrame++;
      }
      return;
    }

    const sortedChildren = [...node.children].sort(
      (a, b) => a.zIndex - b.zIndex,
    );
    for (const child of sortedChildren) {
      this.#drawNodeDirect(ctx, child, viewport);
    }
  }

  // метод для использования offscreen canvas при панорамировании/зуме
  // убирает куллинг
  // #drawNodeDirect(
  //   ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  //   node: GraphNode,
  //   _viewport: Bounds, // пока не используем
  // ) {
  //   if (!node.visible) return;
  //
  //   if (node.type === NodesTypes.SHAPE) {
  //     const shapeNode = node as ShapeNode;
  //     // БЕЗ куллинга: всегда рисуем
  //     shapeNode.shape.draw(ctx as CanvasRenderingContext2D);
  //     return;
  //   }
  //
  //   const sortedChildren = [...node.children].sort((a, b) => a.zIndex - b.zIndex);
  //   for (const child of sortedChildren) {
  //     this.#drawNodeDirect(ctx, child, _viewport);
  //   }
  // }

  #intersects(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }
}
