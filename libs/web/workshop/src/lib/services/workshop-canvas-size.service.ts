import { inject, Injectable } from '@angular/core';
import { WorkshopCanvasService } from './workshop-canvas.service';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { debounceTime, fromEvent, merge, Observable, tap } from 'rxjs';
import { WorkshopCoordsService } from './workshop-coords.service';

/** Измеряет и обновляет размеры рабочей области холста. */
@Injectable()
export class WorkshopCanvasSizeService {
  #canvasService = inject(WorkshopCanvasService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);
  #coordsService = inject(WorkshopCoordsService);

  canvasWidth = 0;
  canvasHeight = 0;

  headerHeight = 0;
  leftSidebarWidth = 0;
  rightSidebarWidth = 0;

  /**
   * Создаёт поток событий изменения размера окна и холста.
   *
   * События объединяются и ограничиваются по частоте перед пересчётом размеров.
   */
  listenResizeEvent() {
    const windowResize$ = fromEvent(window, 'resize');
    const canvasResize$ = new Observable<void>((subscriber) => {
      const canvas = this.#canvasService.canvasRef.nativeElement;
      const observer = new ResizeObserver(() => subscriber.next());
      observer.observe(canvas);
      return () => observer.disconnect();
    });

    return merge(windowResize$, canvasResize$).pipe(
      debounceTime(100),
      tap(() => this.resizeCanvas()),
    );
  }

  /**
   * Инициализирует размеры холста без повторной отрисовки.
   */
  setup() {
    this.resizeCanvas(false);
  }

  /**
   * Пересчитывает размеры холста и обновляет видимую область карты.
   *
   * @param redraw Нужно ли перерисовать холст после изменения его размеров.
   */
  resizeCanvas(redraw = true) {
    const canvas = this.#canvasService.canvasRef.nativeElement;
    const bounds = canvas.getBoundingClientRect();

    this.canvasWidth = Math.round(
      bounds.width ||
        window.innerWidth - this.rightSidebarWidth - this.leftSidebarWidth,
    );
    this.canvasHeight = Math.round(
      bounds.height || window.innerHeight - this.headerHeight - 35,
    );

    const hasSameSize =
      canvas.width === this.canvasWidth && canvas.height === this.canvasHeight;

    if (hasSameSize) return;

    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    this.#coordsService.updateViewport(
      this.#coordsService.cameraX,
      this.#coordsService.cameraY,
      this.#coordsService.zoom,
      canvas.width,
      canvas.height,
    );

    if (redraw) this.#canvasManagerService.redraw();
  }
}
