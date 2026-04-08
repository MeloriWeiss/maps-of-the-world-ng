import { inject, Injectable } from '@angular/core';
import { WorkshopCanvasService } from './workshop-canvas.service';
import { WorkshopShapesService } from './workshop-shapes.service';
import { WorkshopCoordsService } from './workshop-coords.service';
import { fromEvent } from 'rxjs';
import { WorkshopShapesStorageService } from './workshop-shapes-storage.service';
import { WorkshopQuadtreeService } from './workshop-quadtree.service';

@Injectable()
export class WorkshopCanvasManagerService {
  #workshopCanvasService = inject(WorkshopCanvasService);
  #workshopShapesService = inject(WorkshopShapesService);
  #workshopShapesStorageService = inject(WorkshopShapesStorageService);
  #workshopCoordsService = inject(WorkshopCoordsService);
  // #quadtreeService = inject(WorkshopQuadtreeService);

  // shapes = this.#workshopShapesStorageService.shapes;
  // layers = this.#workshopShapesStorageService.layers;
  // layersOrder = this.#workshopShapesStorageService.layersOrder;
  #rootNode = this.#workshopShapesStorageService.rootNode;

  #frameScheduled = false;
  #dirtyForRedraw = false;

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
    const ctx = this.#workshopCanvasService.ctx;

    this.clearCanvas();

    const zoom = this.#workshopCoordsService.zoom;

    ctx.translate(
      -this.#workshopCoordsService.cameraX,
      -this.#workshopCoordsService.cameraY,
    );
    ctx.scale(zoom, zoom);

    this.render();
  }

  render() {
    const ctx = this.#workshopCanvasService.ctx;
    const zoom = this.#workshopCoordsService.zoom;

    // ТЕСТОВОЕ ПОЛЕ ---------------------------------
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
    // КОНЕЦ ТЕСТОВОГО ПОЛЯ ---------------------------------

    // const layers = this.layers();
    // const shapes = this.shapes();

    this.#rootNode().draw(ctx);

    // рендерим через quadtree
    // let count = 0;
    // const visible = this.#quadtreeService.retrieve(
    //   this.#workshopCoordsService.worldViewport
    // );
    // for (const item of visible) {
    //   item.data.draw(ctx);
    //   count++;
    // }
    // console.log(count);

    // рендерим видимое
    // let count = 0;
    // for (const shape of shapes) {
    //   if (
    //     this.#quadtreeService.intersects(shape.getBounds(), this.#workshopCoordsService.worldViewport)
    //   ) {
    //     shape.draw(ctx);
    //     count++;
    //   }
    // }
    // console.log(count);

    // рендерим всё
    // let count = 0;
    // for (const shape of shapes) {
    //   count++;
    //   shape.draw(ctx);
    // }
    // console.log(count);

    // рендерим всё со слоями
    // for (const layerId of this.layersOrder()) {
    //   if (!layers[layerId].visible) continue;
    //
    //   for (const shape of shapes) {
    //     if (shape.layerId !== layerId) continue;
    //
    //     shape.draw(ctx);
    //   }
    // }
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
        this.#workshopShapesService.deleteShapes();
      }
      this.redraw();
    });
  }
}
