import { inject } from '@angular/core';
import { Tool } from '../shared';
import { WorkshopShapesService } from '../../services';
import { Line, LineShape } from '../../shapes';
import { Point } from '../../interfaces';
import { ShapesTypes } from '../../consts';

export class PencilTool implements Tool {
  #workshopShapesService = inject(WorkshopShapesService);

  #currentLine: Line | null = null;

  strokeColor = '#000000';
  lineWidth = 2;
  opacity = 1;

  #lastX = 0;
  #lastY = 0;

  minRequiredParams = {
    length: 10,
  };

  startDrawing(
    e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) {
    const worldX = startPoint.x;
    const worldY = startPoint.y;

    this.#lastX = worldX;
    this.#lastY = worldY;

    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.strokeColor;
    ctx.globalAlpha = this.opacity;
    ctx.lineCap = 'round';

    this.#currentLine = new LineShape({
      type: ShapesTypes.LINE,
      points: [{ x: worldX, y: worldY }],
      strokeWidth: this.lineWidth,
      strokeColor: this.strokeColor,
      opacity: this.opacity,
    });
  }

  draw(ctx: CanvasRenderingContext2D, newPoint: Point) {
    if (!newPoint) return;

    const worldX = newPoint.x;
    const worldY = newPoint.y;

    ctx.beginPath();
    ctx.moveTo(this.#lastX, this.#lastY);
    ctx.lineTo(worldX, worldY);
    ctx.stroke();

    this.#lastX = worldX;
    this.#lastY = worldY;

    this.#currentLine?.points.push({ x: worldX, y: worldY });
  }

  stopDrawing() {
    if (!this.#currentLine || !this.enabledToCreate()) return;

    this.#workshopShapesService.addShape(this.#currentLine);
    this.#currentLine = null;
  }

  enabledToCreate() {
    if (!this.#currentLine || this.#currentLine.points.length < 2) return false;

    const points = this.#currentLine.points;

    let length = 0;

    for (let i = 1; i < points.length; i++) {
      const { x: x1, y: y1 } = points[i - 1];
      const { x: x2, y: y2 } = points[i];
      const dx = x2 - x1;
      const dy = y2 - y1;
      length += Math.hypot(dx, dy);
    }

    return length > this.minRequiredParams.length;
  }
}
