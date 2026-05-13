import { inject, Injectable } from '@angular/core';
import { WorkshopCanvasService } from './workshop-canvas.service';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { debounceTime, fromEvent, tap } from 'rxjs';

@Injectable()
export class WorkshopCanvasSizeService {
  #canvasService = inject(WorkshopCanvasService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);

  canvasWidth = 0;
  canvasHeight = 0;

  headerHeight = 0;
  leftSidebarWidth = 0;
  rightSidebarWidth = 0;

  listenResizeEvent() {
    return fromEvent(window, 'resize').pipe(
      debounceTime(100),
      tap(() => this.resizeCanvas()),
    );
  }

  setup() {
    this.resizeCanvas(false);
  }

  resizeCanvas(redraw = true) {
    const canvas = this.#canvasService.canvasRef.nativeElement;

    this.canvasWidth =
      window.innerWidth - this.rightSidebarWidth - this.leftSidebarWidth;

    this.canvasHeight = window.innerHeight - this.headerHeight;

    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    if (redraw) this.#canvasManagerService.redraw();
  }
}
