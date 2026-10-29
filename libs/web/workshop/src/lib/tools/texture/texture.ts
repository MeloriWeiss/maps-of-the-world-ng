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
import { splitStrokePoints } from '../shared/split-stroke-points';

/** Инструмент рисования мазков выбранной текстурой. */
export class TextureTool implements Tool {
  static readonly displayName = 'Покрытие';
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
    this.#shapesService.beginOperation();
    const texture = this.#settingsService.textureStyle;
    const shapeStyle = this.#settingsService.shapeStyle;

    ctx.lineCap = 'round';
    ctx.globalAlpha = shapeStyle.opacity;

    this.#currentStroke = new TextureStrokeShape({
      type: ShapesTypes.TEXTURE,
      points: [{ x: startPoint.x, y: startPoint.y }],
      textureId: texture.textureId,
      textureUrl: texture.textureUrl,
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
    this.#currentStroke.draw(ctx);
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
      this.#shapesService.endOperation();
      return;
    }

    const stroke = this.#currentStroke;
    const parts = splitStrokePoints(stroke.points);
    for (const points of parts) {
      const shape =
        parts.length === 1
          ? stroke
          : new TextureStrokeShape({ ...stroke, points });
      shape.objectId = stroke.id;
      this.#shapesService.createShape(shape);
    }
    this.#currentStroke = null;
    this.#shapesService.endOperation();
    this.#canvasManagerService.requestRedraw();
  }

  enabledToCreate() {
    return Boolean(this.#currentStroke?.points.length);
  }
}
