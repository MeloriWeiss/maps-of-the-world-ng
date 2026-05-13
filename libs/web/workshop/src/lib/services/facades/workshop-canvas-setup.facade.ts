import { DestroyRef, inject, Injectable } from '@angular/core';
import { WorkshopCanvasSizeService } from '../workshop-canvas-size.service';
import { WorkshopCanvasService } from '../workshop-canvas.service';
import { WorkshopPanningService } from '../workshop-panning.service';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkshopDrawService } from '../workshop-draw.service';
import { WorkshopCanvasManagerService } from '../workshop-canvas-manager.service';

@Injectable()
export class WorkshopCanvasSetupFacade {
  #canvasSizeService = inject(WorkshopCanvasSizeService);
  #canvasService = inject(WorkshopCanvasService);
  #panningService = inject(WorkshopPanningService);
  #destroyRef = inject(DestroyRef);
  #drawService = inject(WorkshopDrawService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);

  setupCanvas() {
    this.#setup();
    this.#listenCanvasEvents();
  }

  #setup() {
    this.#canvasService.setup();
    this.#canvasSizeService.setup();
    this.#panningService.setup();
  }

  #listenCanvasEvents() {
    merge(
      this.#drawService.listenDrawEvents(),
      this.#panningService.listenCanvasPanningEvents(),
      this.#canvasManagerService.listenKeyEvents(),
      this.#canvasSizeService.listenResizeEvent(),
    )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }
}
