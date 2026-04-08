import { inject } from '@angular/core';
import { Tool } from '../shared';
import {
  WorkshopCanvasManagerService,
  WorkshopShapesService,
} from '../../services';
import { Rectangle, RectangleShape } from '../../shapes';
import { Point } from '../../interfaces/point.interface';
import { ShapesTypes } from '../../consts';

export class RectangleTool implements Tool {
  #workshopShapesService = inject(WorkshopShapesService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);

  #currentRect: Rectangle | null = null;

  strokeColor = '#000000';
  fillColor = '#BD404030';
  strokeWidth = 1;
  opacity = 1;

  #startX!: number;
  #startY!: number;

  minRequiredParams = {
    width: 10,
    height: 10,
  };

  startDrawing(
    e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) {
    ctx.lineWidth = this.strokeWidth;
    ctx.strokeStyle = this.strokeColor;
    ctx.fillStyle = this.fillColor;
    ctx.globalAlpha = this.opacity;

    this.#startX = startPoint.x;
    this.#startY = startPoint.y;

    this.#currentRect = new RectangleShape({
      type: ShapesTypes.RECTANGLE,
      x: startPoint.x,
      y: startPoint.y,
      width: 0,
      height: 0,
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
    });
  }

  draw(ctx: CanvasRenderingContext2D, newPoint: Point) {
    if (!this.#currentRect) return;

    this.#workshopCanvasManagerService.redraw();

    let rectWidth = newPoint.x - this.#startX;
    let rectHeight = newPoint.y - this.#startY;

    if (rectWidth < 0) {
      this.#currentRect.x = newPoint.x;
    }
    if (rectHeight < 0) {
      this.#currentRect.y = newPoint.y;
    }

    rectWidth = Math.abs(rectWidth);
    rectHeight = Math.abs(rectHeight);

    this.#currentRect.width = rectWidth;
    this.#currentRect.height = rectHeight;

    this.#workshopCanvasManagerService.render();

    ctx.fillStyle = this.fillColor;

    ctx.beginPath();
    ctx.fillRect(
      this.#currentRect.x,
      this.#currentRect.y,
      rectWidth,
      rectHeight,
    );
    ctx.strokeRect(
      this.#currentRect.x,
      this.#currentRect.y,
      rectWidth,
      rectHeight,
    );
  }

  stopDrawing() {
    if (!this.#currentRect || !this.enabledToCreate()) return;

    this.#workshopShapesService.addShape(this.#currentRect);
    this.#currentRect = null;
  }

  enabledToCreate() {
    if (!this.#currentRect) return false;

    return (
      this.#currentRect.width > this.minRequiredParams.width &&
      this.#currentRect.height > this.minRequiredParams.height
    );
  }
}
