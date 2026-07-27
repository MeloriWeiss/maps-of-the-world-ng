import { inject } from '@angular/core';
import { Tool } from '../shared';
import { WorkshopSettingsService, WorkshopShapesService } from '../../services';
import { TextShape } from '../../shapes';
import { Point } from '../../interfaces';
import { ShapesTypes } from '../../consts';

export class TextTool implements Tool {
  #shapesService = inject(WorkshopShapesService);
  #settingsService = inject(WorkshopSettingsService);

  startDrawing(
    ...[, , startPoint]: [MouseEvent, CanvasRenderingContext2D, Point]
  ) {
    const style = this.#settingsService.textStyle;
    const shapeStyle = this.#settingsService.shapeStyle;

    const textShape = new TextShape({
      type: ShapesTypes.TEXT,
      text: style.defaultText,
      x: startPoint.x,
      y: startPoint.y,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fillColor: style.fillColor,
      strokeColor: shapeStyle.strokeColor,
      strokeWidth: 0,
      opacity: shapeStyle.opacity,
      shadowColor: shapeStyle.shadowColor,
      shadowBlur: shapeStyle.shadowBlur,
      shadowOffsetX: shapeStyle.shadowOffsetX,
      shadowOffsetY: shapeStyle.shadowOffsetY,
    });

    this.#shapesService.createShape(textShape);
  }

  draw() {
    return;
  }

  stopDrawing() {
    return;
  }
}
