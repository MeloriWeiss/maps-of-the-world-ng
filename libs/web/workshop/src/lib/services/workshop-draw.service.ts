import { inject, Injectable } from '@angular/core';
import { WorkshopSettingsService } from './workshop-settings.service';
import { fromEvent, merge, switchMap, takeUntil } from 'rxjs';
import { WorkshopCoordsService } from './workshop-coords.service';
import { WorkshopToolsService } from './workshop-tools.service';
import { WorkshopCanvasService } from './workshop-canvas.service';

@Injectable()
export class WorkshopDrawService {
  #workshopSettingsService = inject(WorkshopSettingsService);
  #workshopCoordsService = inject(WorkshopCoordsService);
  #workshopToolsService = inject(WorkshopToolsService);
  #workshopCanvasService = inject(WorkshopCanvasService);

  canvasRef = this.#workshopCanvasService.canvasRef;
  ctx = this.#workshopCanvasService.ctx;

  strokeColor = '#000000';
  lineWidth = 2;
  opacity = 1;

  isDrawing = false;

  listenDrawEvents() {
    this.canvasRef = this.#workshopCanvasService.canvasRef;
    this.ctx = this.#workshopCanvasService.ctx;

    const canvas = this.canvasRef.nativeElement;

    const drawStart$ = fromEvent<MouseEvent, void>(canvas, 'mousedown', (e) =>
      this.startDrawing(e),
    );
    const drawMove$ = fromEvent<MouseEvent, void>(canvas, 'mousemove', (e) =>
      this.draw(e),
    );
    const drawEndOnMouseUp$ = fromEvent<MouseEvent, void>(
      canvas,
      'mouseup',
      (e) => this.stopDrawing(e),
    );
    const drawEndOnMouseOut$ = fromEvent<MouseEvent, void>(
      canvas,
      'mouseout',
      (e) => this.stopDrawing(e),
    );

    const drawEnd$ = merge(drawEndOnMouseUp$, drawEndOnMouseOut$);

    return drawStart$.pipe(
      switchMap(() => drawMove$.pipe(takeUntil(drawEnd$))),
    );
  }

  startDrawing(e: MouseEvent) {
    if (e.button !== this.#workshopSettingsService.drawMouseButton) return;

    this.isDrawing = true;

    const worldCoords = this.#workshopCoordsService.getWorldCoords(
      e,
      this.canvasRef,
    );

    this.#workshopToolsService.currentTool.startDrawing(
      e,
      this.ctx,
      worldCoords,
    );
  }

  draw(e: MouseEvent) {
    if (!this.isDrawing) return;

    const worldCoords = this.#workshopCoordsService.getWorldCoords(
      e,
      this.canvasRef,
    );

    this.#workshopToolsService.currentTool.draw(this.ctx, worldCoords);
  }

  stopDrawing(e: MouseEvent) {
    if (!this.isDrawing) return;

    this.isDrawing = false;

    const worldCoords = this.#workshopCoordsService.getWorldCoords(
      e,
      this.canvasRef,
    );

    this.#workshopToolsService.currentTool.stopDrawing(worldCoords);
  }
}
