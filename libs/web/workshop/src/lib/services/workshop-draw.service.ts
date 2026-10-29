import { inject, Injectable } from '@angular/core';
import { WorkshopSettingsService } from './workshop-settings.service';
import { fromEvent, merge, switchMap, takeUntil } from 'rxjs';
import { WorkshopCoordsService } from './workshop-coords.service';
import { WorkshopToolsService } from './workshop-tools.service';
import { WorkshopCanvasService } from './workshop-canvas.service';
import { WorkshopShapesService } from './workshop-shapes.service';
import { WorkshopChunksService } from './workshop-chunks.service';
import { WorkshopModeService } from './workshop-mode.service';

/** Организует перерисовку холста и отображение текущего состояния сцены. */
@Injectable()
export class WorkshopDrawService {
  #workshopSettingsService = inject(WorkshopSettingsService);
  #workshopCoordsService = inject(WorkshopCoordsService);
  #workshopToolsService = inject(WorkshopToolsService);
  #workshopCanvasService = inject(WorkshopCanvasService);
  #shapes = inject(WorkshopShapesService);
  #chunks = inject(WorkshopChunksService);
  #mode = inject(WorkshopModeService);

  canvasRef = this.#workshopCanvasService.canvasRef;
  ctx = this.#workshopCanvasService.ctx;

  strokeColor = '#000000';
  lineWidth = 1;
  opacity = 1;

  isDrawing = false;

  /** Создаёт поток событий рисования для текущего холста. */
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

  /** Начинает операцию рисования, если режим и кнопка мыши это разрешают. */
  startDrawing(e: MouseEvent) {
    if (!this.#chunks.canEditViewport()) return;
    if (this.#mode.isReadOnly()) return;
    if (e.button !== this.#workshopSettingsService.drawMouseButton) return;

    this.#shapes.beginOperation();
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

  /** Передаёт текущую позицию указателя активному инструменту. */
  draw(e: MouseEvent) {
    if (this.#mode.isReadOnly()) return;
    if (!this.isDrawing) return;

    const worldCoords = this.#workshopCoordsService.getWorldCoords(
      e,
      this.canvasRef,
    );

    this.#workshopToolsService.currentTool.draw(this.ctx, worldCoords);
  }

  /** Завершает рисование и фиксирует выполненную операцию в истории. */
  stopDrawing(e: MouseEvent) {
    if (this.#mode.isReadOnly()) {
      this.isDrawing = false;
      return;
    }
    if (!this.isDrawing) return;

    this.isDrawing = false;

    const worldCoords = this.#workshopCoordsService.getWorldCoords(
      e,
      this.canvasRef,
    );

    this.#workshopToolsService.currentTool.stopDrawing(worldCoords);
    this.#shapes.endOperation();
  }
}
