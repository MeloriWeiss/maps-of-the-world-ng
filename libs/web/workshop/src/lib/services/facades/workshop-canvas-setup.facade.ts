import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { WorkshopCanvasSizeService } from '../workshop-canvas-size.service';
import { WorkshopCanvasService } from '../workshop-canvas.service';
import { WorkshopPanningService } from '../workshop-panning.service';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkshopDrawService } from '../workshop-draw.service';
import { WorkshopCanvasManagerService } from '../workshop-canvas-manager.service';
import { WorkshopSceneGraphService } from '../workshop-scene-graph.service';

@Injectable()
export class WorkshopCanvasSetupFacade {
  #canvasSizeService = inject(WorkshopCanvasSizeService);
  #canvasService = inject(WorkshopCanvasService);
  #panningService = inject(WorkshopPanningService);
  #destroyRef = inject(DestroyRef);
  #drawService = inject(WorkshopDrawService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);
  #sceneGraphService = inject(WorkshopSceneGraphService);
  #resolveCanvasSetup: (() => void) | null = null;
  #canvasSetup = new Promise<void>((resolve) => {
    this.#resolveCanvasSetup = resolve;
  });

  readonly isReady = signal(false);
  readonly loadingMessage = signal('Подготавливаем редактор');

  setupCanvas() {
    this.loadingMessage.set('Восстанавливаем карту');
    this.#sceneGraphService.getNodes();
    this.#setup();
    this.#listenCanvasEvents();
    this.#resolveCanvasSetup?.();
    this.#resolveCanvasSetup = null;
  }

  async waitUntilCanvasSetup(): Promise<void> {
    await this.#canvasSetup;
  }

  async waitUntilMapReady(): Promise<void> {
    this.loadingMessage.set('Загружаем текстуры');
    await this.#sceneGraphService.waitUntilShapesReady();
  }

  finishInitialization() {
    this.loadingMessage.set('Карта готова');
    this.isReady.set(true);
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
      this.#sceneGraphService.nodesSaves$,
    )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }
}
