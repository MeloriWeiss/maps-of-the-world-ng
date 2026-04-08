import { inject, Injectable } from '@angular/core';
import { fromEvent, merge, switchMap, takeUntil } from 'rxjs';
import { WorkshopDrawService } from './workshop-draw.service';
import { WorkshopSettingsService } from './workshop-settings.service';
import { WorkshopCoordsService } from './workshop-coords.service';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { WorkshopCanvasService } from './workshop-canvas.service';

@Injectable()
export class WorkshopPanningService {
  #workshopDrawService = inject(WorkshopDrawService);
  #workshopSettingsService = inject(WorkshopSettingsService);
  #workshopCoordsService = inject(WorkshopCoordsService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  #workshopCanvasService = inject(WorkshopCanvasService);

  canvasWidth = 0;
  canvasHeight = 0;

  isPanning = false;
  panStartX = 0;
  panStartY = 0;
  cameraStartX = 0;
  cameraStartY = 0;

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

  listenResizeEvent() {
    return fromEvent(window, 'resize', () => this.#resizeCanvas());
  }

  listenCanvasManagementEvents() {
    const panningEvents$ = this.listenPanningEvents();
    const zoomEvent$ = this.listenZoomEvent();
    const resizeEvent$ = this.listenResizeEvent();

    return merge(panningEvents$, zoomEvent$, resizeEvent$);
  }

  prepareCanvas() {
    this.#resizeCanvas(false);
    this.#centerCanvas(false);
    this.#updateViewport(false);

    this.redraw();
  }

  #resizeCanvas(redraw = true) {
    const canvas = this.#workshopCanvasService.canvasRef.nativeElement;

    this.canvasWidth = window.innerWidth - 350;
    this.canvasHeight = window.innerHeight - 37;

    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    if (redraw) this.redraw();
  }

  #centerCanvas(redraw = true) {
    this.#workshopCoordsService.cameraX = -this.canvasWidth / 2;
    this.#workshopCoordsService.cameraY = -this.canvasHeight / 2;

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

    const rect =
      this.#workshopDrawService.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = rect.left - e.clientX;
    const mouseY = rect.top - e.clientY;

    const worldX = (mouseX - this.#workshopCoordsService.cameraX) / oldZoom;
    const worldY = (mouseY - this.#workshopCoordsService.cameraY) / oldZoom;

    this.#workshopCoordsService.cameraX -= (zoom - oldZoom) * worldX;
    this.#workshopCoordsService.cameraY -= (zoom - oldZoom) * worldY;

    this.#updateViewport();
  }

  onMouseDown(e: MouseEvent) {
    if (e.button !== this.#workshopSettingsService.panningMouseButton) return;

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
}
