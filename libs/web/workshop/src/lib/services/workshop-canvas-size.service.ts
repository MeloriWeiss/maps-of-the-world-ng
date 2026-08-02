import { inject, Injectable } from '@angular/core';
import { WorkshopCanvasService } from './workshop-canvas.service';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { debounceTime, fromEvent, merge, Observable, tap } from 'rxjs';
import { WorkshopCoordsService } from './workshop-coords.service';

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

  setup() {
    this.resizeCanvas(false);
  }

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

    if (
      canvas.width === this.canvasWidth &&
      canvas.height === this.canvasHeight
    ) {
      return;
    }

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
