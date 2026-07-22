import { inject } from '@angular/core';
import { Tool } from '../shared';
import {
  WorkshopCanvasManagerService,
  WorkshopSettingsService,
  WorkshopShapesService,
} from '../../services';
import { TextureStroke, TextureStrokeShape } from '../../shapes';
import { Point } from '../../interfaces';
import { ShapesTypes } from '../../consts';

export class TextureTool implements Tool {
  #shapesService = inject(WorkshopShapesService);
  #settingsService = inject(WorkshopSettingsService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);

  #currentStroke: TextureStroke | null = null;

  minRequiredParams = { length: 10 };

  startDrawing(
    _e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) {
    const texture = this.#settingsService.textureStyle;
    const shapeStyle = this.#settingsService.shapeStyle;

    ctx.lineCap = 'round';
    ctx.globalAlpha = shapeStyle.opacity;

    this.#currentStroke = new TextureStrokeShape({
      type: ShapesTypes.TEXTURE,
      points: [{ x: startPoint.x, y: startPoint.y }],
      textureScale: texture.textureScale,
      textureRotation: texture.textureRotation,
      textureColor: texture.textureColor,
      strokeColor: shapeStyle.strokeColor,
      strokeWidth: texture.strokeWidth,
      opacity: shapeStyle.opacity,
      shadowColor: shapeStyle.shadowColor,
      shadowBlur: shapeStyle.shadowBlur,
      shadowOffsetX: shapeStyle.shadowOffsetX,
      shadowOffsetY: shapeStyle.shadowOffsetY,
    });
  }

  draw(ctx: CanvasRenderingContext2D, newPoint: Point) {
    if (!this.#currentStroke) return;

    this.#canvasManagerService.redraw();

    this.#currentStroke.points.push({ x: newPoint.x, y: newPoint.y });
    this.#currentStroke.draw(ctx);
  }

  stopDrawing() {
    if (!this.#currentStroke || !this.enabledToCreate()) {
      this.#currentStroke = null;
      return;
    }

    this.#shapesService.createShape(this.#currentStroke);
    this.#currentStroke = null;
    this.#canvasManagerService.requestRedraw();
  }

  enabledToCreate() {
    if (!this.#currentStroke || this.#currentStroke.points.length < 2) {
      return false;
    }

    let length = 0;
    const points = this.#currentStroke.points;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y,
      );
    }
    return length > (this.minRequiredParams.length as number);
  }
}
