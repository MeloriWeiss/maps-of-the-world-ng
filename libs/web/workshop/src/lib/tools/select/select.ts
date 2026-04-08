import { inject } from '@angular/core';
import { Tool } from '../shared';
import {
  WorkshopCanvasManagerService,
  WorkshopShapesService,
} from '../../services';
import { SelectionRect } from './selection-rect.interface';
import { Point } from '../../interfaces';
import { Shape } from '../../shapes';

export class SelectTool implements Tool {
  #workshopShapesService = inject(WorkshopShapesService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);

  nodes = this.#workshopShapesService.nodes;

  #selectionRect: SelectionRect | null = null;

  #selectedShapes: Shape[] = [];
  #selection = false;

  // #lastX!: number;
  // #lastY!: number;

  startDrawing(
    e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) {
    // this.#lastX = startPoint.x;
    // this.#lastY = startPoint.y;

    if (e.shiftKey) {
      // for (const shape of this.shapes()) {
      //   if (!this.#workshopShapesService.isShapeVisible(shape)) continue;
      //   if (shape.selected) continue;
      //
      //   const selected = shape.selectByClick(startPoint);
      //
      //   if (selected) this.#selectedShapes.push(shape);
      // }
      // this.#workshopCanvasManagerService.render();
      //
      // return;
    }

    if (!this.clickOnSelectedShapes(startPoint)) {
      for (const shape of this.#selectedShapes) {
        shape.selected = false;
      }
      this.#selectedShapes = [];
    }

    if (this.#selectedShapes.length) return;

    this.#selectedShapes = [];
    this.#selection = true;

    // for (const shape of this.shapes()) {
    //   if (!this.#workshopShapesService.isShapeVisible(shape)) continue;
    //
    //   const selected = shape.selectByClick(startPoint);
    //
    //   if (selected) this.#selectedShapes.push(shape);
    // }
    this.#workshopCanvasManagerService.render();

    this.#selectionRect = {
      x: startPoint.x,
      y: startPoint.y,
      width: 0,
      height: 0,
    };
  }

  draw(ctx: CanvasRenderingContext2D, newPoint: Point) {
    this.#workshopCanvasManagerService.redraw();

    if (this.#selectedShapes.length && !this.#selection) {
      // for (const shape of this.shapes()) {
      //   if (!this.#workshopShapesService.isShapeVisible(shape)) continue;
      //   if (!shape.selected) continue;
      //
      //   shape.changePosition({
      //     x: newPoint.x - this.#lastX,
      //     y: newPoint.y - this.#lastY,
      //   });
      // }
      this.#workshopCanvasManagerService.render();
    }

    // this.#lastX = newPoint.x;
    // this.#lastY = newPoint.y;

    if (!this.#selectionRect) return;

    const rectX = Math.min(this.#selectionRect.x, newPoint.x);
    const rectY = Math.min(this.#selectionRect.y, newPoint.y);

    let rectWidth = newPoint.x - this.#selectionRect.x;
    let rectHeight = newPoint.y - this.#selectionRect.y;

    this.#selectionRect.width = rectWidth;
    this.#selectionRect.height = rectHeight;

    this.#workshopCanvasManagerService.render();

    rectWidth = Math.abs(rectWidth);
    rectHeight = Math.abs(rectHeight);

    ctx.strokeStyle = '#0199dc';
    ctx.fillStyle = '#16B7FF11';
    ctx.lineWidth = 1;

    ctx.setLineDash([4, 2]);
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    ctx.setLineDash([]);

    this.#selectedShapes = [];

    // for (const shape of this.shapes()) {
    //   if (!this.#workshopShapesService.isShapeVisible(shape)) continue;
    //
    //   const selected = shape.selectByDraw({
    //     x: rectX,
    //     y: rectY,
    //     width: rectWidth,
    //     height: rectHeight,
    //   });
    //
    //   if (selected) this.#selectedShapes.push(shape);
    // }
  }

  stopDrawing() {
    this.#selection = false;

    this.#workshopCanvasManagerService.redraw();

    this.#workshopShapesService.saveNodes();

    this.#selectionRect = null;
  }

  clickOnSelectedShapes(point: Point) {
    for (const shape of this.#selectedShapes) {
      if (!shape.selected) continue;

      if (shape.clickOn(point)) return true;
    }
    return false;
  }
}
