import { inject } from '@angular/core';
import { Tool } from '../shared';
import {
  WorkshopCanvasManagerService,
  WorkshopSettingsService,
  WorkshopShapesService,
} from '../../services';
import { Rectangle, RectangleShape } from '../../shapes';
import { Point } from '../../interfaces/point.interface';
import { ShapesTypes } from '../../consts';

export class RectangleTool implements Tool {
  #shapesService = inject(WorkshopShapesService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);
  #settingsService = inject(WorkshopSettingsService);

  #currentRect: Rectangle | null = null;

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
    const style = this.#settingsService.shapeStyle;
    ctx.lineWidth = style.strokeWidth;
    ctx.strokeStyle = style.strokeColor;
    ctx.fillStyle = style.fillColor;
    ctx.globalAlpha = style.opacity;

    this.#startX = startPoint.x;
    this.#startY = startPoint.y;

    this.#currentRect = new RectangleShape({
      type: ShapesTypes.RECTANGLE,
      x: startPoint.x,
      y: startPoint.y,
      width: 0,
      height: 0,
      fillColor: style.fillColor,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
    });
  }

  draw(ctx: CanvasRenderingContext2D, newPoint: Point) {
    if (!this.#currentRect) return;

    this.#canvasManagerService.redraw();

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

    this.#canvasManagerService.render();

    ctx.fillStyle = this.#settingsService.shapeStyle.fillColor;

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

    this.#shapesService.createShape(this.#currentRect);
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
