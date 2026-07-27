import { inject, Injectable, signal } from '@angular/core';
import { fromEvent, merge, switchMap, takeUntil } from 'rxjs';
import { WorkshopDrawService } from './workshop-draw.service';
import { WorkshopSettingsService } from './workshop-settings.service';
import { WorkshopCoordsService } from './workshop-coords.service';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { WorkshopCanvasService } from './workshop-canvas.service';
import { WorkshopCanvasSizeService } from './workshop-canvas-size.service';
import { Bounds } from '../interfaces';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';

@Injectable()
export class WorkshopPanningService {
  #workshopDrawService = inject(WorkshopDrawService);
  #workshopSettingsService = inject(WorkshopSettingsService);
  #workshopCoordsService = inject(WorkshopCoordsService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  #workshopCanvasService = inject(WorkshopCanvasService);
  #canvasSizeService = inject(WorkshopCanvasSizeService);
  #sceneStorage = inject(WorkshopSceneGraphStorageService);

  isPanning = false;
  panStartX = 0;
  panStartY = 0;
  cameraStartX = 0;
  cameraStartY = 0;
  zoomPercent = signal(100);
  zoomSliderPosition = signal(this.#zoomToSlider(1));
  worldBounds: Bounds = {
    x: -25_000,
    y: -17_000,
    width: 54_000,
    height: 34_000,
  };

  listenPanningEvents() {
    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;

    const panningStart$ = fromEvent<MouseEvent, void>(
      canvas,
      'mousedown',
      (e) => this.onMouseDown(e),
    );
    const panningMove$ = fromEvent<MouseEvent, void>(canvas, 'mousemove', (e) =>
      this.onMouseMove(e),
    );
    const panningEndOnMouseUp$ = fromEvent(canvas, 'mouseup', () =>
      this.onMouseUp(),
    );
    const panningEndOnMouseOut$ = fromEvent(canvas, 'mouseout', () =>
      this.onMouseUp(),
    );

    const panningEnd$ = merge(panningEndOnMouseUp$, panningEndOnMouseOut$);

    return panningStart$.pipe(
      switchMap(() => panningMove$.pipe(takeUntil(panningEnd$))),
    );
  }

  listenZoomEvent() {
    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;

    return fromEvent<WheelEvent, void>(canvas, 'wheel', (e) => this.onWheel(e));
  }

  listenCanvasPanningEvents() {
    const panningEvents$ = this.listenPanningEvents();
    const zoomEvent$ = this.listenZoomEvent();

    return merge(panningEvents$, zoomEvent$);
  }

  setup() {
    if (!this.fitContent()) {
      this.#centerCanvas(false);
      this.#updateViewport();
    }
  }

  #centerCanvas(redraw = true) {
    this.#workshopCoordsService.cameraX =
      -this.#canvasSizeService.canvasWidth / 2;
    this.#workshopCoordsService.cameraY =
      -this.#canvasSizeService.canvasHeight / 2;

    if (redraw) this.redraw();
  }

  #updateViewport(redraw = true) {
    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;

    this.#workshopCoordsService.updateViewport(
      this.#workshopCoordsService.cameraX,
      this.#workshopCoordsService.cameraY,
      this.#workshopCoordsService.zoom,
      canvas.width,
      canvas.height,
    );

    if (redraw) this.#workshopCanvasManagerService.requestRedraw();
  }

  onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;

    e.preventDefault();

    let zoom = this.#workshopCoordsService.zoom;

    const zoomFactor = 1.1;
    const oldZoom = zoom;

    if (e.deltaY < 0) {
      this.#workshopCoordsService.zoom *= zoomFactor;
    } else {
      this.#workshopCoordsService.zoom /= zoomFactor;
    }

    zoom = this.#workshopCoordsService.zoom;
    this.zoomPercent.set(Math.round(zoom * 100));
    this.zoomSliderPosition.set(this.#zoomToSlider(zoom));

    const rect =
      this.#workshopDrawService.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX + this.#workshopCoordsService.cameraX) / oldZoom;
    const worldY = (mouseY + this.#workshopCoordsService.cameraY) / oldZoom;

    this.#workshopCoordsService.cameraX += (zoom - oldZoom) * worldX;
    this.#workshopCoordsService.cameraY += (zoom - oldZoom) * worldY;

    this.#updateViewport();
  }

  setZoomPercent(percent: number) {
    const oldZoom = this.#workshopCoordsService.zoom;
    const nextZoom = Math.min(
      this.#workshopCoordsService.maxZoom,
      Math.max(this.#workshopCoordsService.minZoom, percent / 100),
    );
    if (nextZoom === oldZoom) return;

    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;
    const mouseX = canvas.width / 2;
    const mouseY = canvas.height / 2;
    const worldX = (mouseX + this.#workshopCoordsService.cameraX) / oldZoom;
    const worldY = (mouseY + this.#workshopCoordsService.cameraY) / oldZoom;

    this.#workshopCoordsService.zoom = nextZoom;
    this.#workshopCoordsService.cameraX += (nextZoom - oldZoom) * worldX;
    this.#workshopCoordsService.cameraY += (nextZoom - oldZoom) * worldY;
    this.zoomPercent.set(Math.round(nextZoom * 100));
    this.zoomSliderPosition.set(this.#zoomToSlider(nextZoom));
    this.#updateViewport();
  }

  setZoomSliderPosition(position: number) {
    const min = this.#workshopCoordsService.minZoom;
    const max = this.#workshopCoordsService.maxZoom;
    const normalized = Math.min(100, Math.max(0, position)) / 100;
    this.setZoomPercent(min * Math.pow(max / min, normalized) * 100);
  }

  setWorldBounds(bounds: Bounds) {
    this.worldBounds = bounds;
  }

  fitWorld() {
    this.fitBounds(this.worldBounds);
  }

  fitContent() {
    const shapes = Array.from(this.#sceneStorage.shapes.values());
    if (shapes.length === 0) return false;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const shape of shapes) {
      const bounds = shape.getBounds();
      if (
        !Number.isFinite(bounds.x) ||
        !Number.isFinite(bounds.y) ||
        !Number.isFinite(bounds.width) ||
        !Number.isFinite(bounds.height)
      ) {
        continue;
      }
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return false;

    const bounds = {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
    this.setWorldBounds(bounds);
    this.fitBounds(bounds);
    return true;
  }

  fitBounds(bounds: Bounds, padding = 0.9) {
    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const nextZoom = Math.min(
      this.#workshopCoordsService.maxZoom,
      Math.max(
        this.#workshopCoordsService.minZoom,
        Math.min(canvas.width / bounds.width, canvas.height / bounds.height) *
          padding,
      ),
    );
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    this.#workshopCoordsService.zoom = nextZoom;
    this.#workshopCoordsService.cameraX = centerX * nextZoom - canvas.width / 2;
    this.#workshopCoordsService.cameraY =
      centerY * nextZoom - canvas.height / 2;
    this.zoomPercent.set(Math.round(nextZoom * 100));
    this.zoomSliderPosition.set(this.#zoomToSlider(nextZoom));
    this.#updateViewport();
  }

  onMouseDown(e: MouseEvent) {
    if (e.button !== this.#workshopSettingsService.panningMouseButton) return;

    e.preventDefault();
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.cameraStartX = this.#workshopCoordsService.cameraX;
    this.cameraStartY = this.#workshopCoordsService.cameraY;
  }

  onMouseUp() {
    this.isPanning = false;
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isPanning) return;

    const deltaX = this.panStartX - e.clientX;
    const deltaY = this.panStartY - e.clientY;
    this.#workshopCoordsService.cameraX = this.cameraStartX + deltaX;
    this.#workshopCoordsService.cameraY = this.cameraStartY + deltaY;

    this.#updateViewport();
  }

  redraw() {
    this.#workshopCanvasManagerService.redraw();
  }

  #zoomToSlider(zoom: number) {
    const min = this.#workshopCoordsService.minZoom;
    const max = this.#workshopCoordsService.maxZoom;
    return (Math.log(zoom / min) / Math.log(max / min)) * 100;
  }
}
