import type {
  WorkshopShapeStyle,
  WorkshopToolStyle,
} from '../interfaces/workshop-settings';
import { Injectable } from '@angular/core';
import { workshopDefaultSettings, WorkshopTools } from '../consts';

/** Хранит настройки редактора и стили инструментов Workshop. */
@Injectable()
export class WorkshopSettingsService {
  panningMouseButton = workshopDefaultSettings.panningMouseButton;
  drawMouseButton = workshopDefaultSettings.drawMouseButton;

  shapeStyle: WorkshopShapeStyle = {
    strokeColor: '#000000',
    fillColor: '#bd4040',
    strokeWidth: 2,
    opacity: 1,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };

  textStyle = {
    fontSize: 13,
    fontFamily: 'Play, serif',
    fillColor: '#ffffff',
    defaultText: 'Текст',
  };

  textureStyle = {
    textureId: null as string | null,
    textureUrl: null as string | null,
    textureColor: '#c4a574',
    textureScale: 1,
    textureRotation: 0,
    strokeWidth: 12,
  };

  stampStyle = {
    textureId: null as string | null,
    textureUrl: null as string | null,
    width: 96,
    aspect: 1,
    spacing: 0.65,
    scatter: 0.2,
    rotation: 0,
    rotationVariation: 0,
    sizeVariation: 0.15,
    mode: 'distance' as 'distance' | 'time',
    interval: 150,
  };
  eraserObjectsOnly = false;

  readonly toolStyles: Record<WorkshopTools, WorkshopToolStyle> = {
    [WorkshopTools.STAMP]: {
      strokeColor: this.shapeStyle.strokeColor,
      fillColor: this.shapeStyle.fillColor,
      strokeWidth: 96,
    },

    [WorkshopTools.SELECT]: {
      strokeColor: '#000000',
      fillColor: '#000000',
      strokeWidth: 1,
    },

    [WorkshopTools.PENCIL]: {
      strokeColor: '#000000',
      fillColor: '#000000',
      strokeWidth: 2,
    },

    [WorkshopTools.ERASER]: {
      strokeColor: '#000000',
      fillColor: '#ffffff',
      strokeWidth: 12,
    },

    [WorkshopTools.RECTANGLE]: {
      strokeColor: '#000000',
      fillColor: '#bd4040',
      strokeWidth: 2,
    },

    [WorkshopTools.TEXT]: {
      strokeColor: '#000000',
      fillColor: '#ffffff',
      strokeWidth: 1,
    },

    [WorkshopTools.TEXTURE]: {
      strokeColor: '#c4a574',
      fillColor: '#c4a574',
      strokeWidth: 12,
    },
  };

  /**
   * Обновляет сохранённые настройки выбранного инструмента.
   *
   * @param tool Инструмент, настройки которого нужно изменить.
   * @param patch Изменяемые свойства стиля.
   */
  updateToolStyle(
    tool: WorkshopTools,
    patch: Partial<WorkshopToolStyle>,
  ): void {
    Object.assign(this.toolStyles[tool], patch);
  }

  /**
   * Применяет сохранённый стиль к активному инструменту и его настройкам.
   *
   * @param tool Инструмент, стиль которого нужно применить.
   */
  applyToolStyle(tool: WorkshopTools): void {
    const style = this.toolStyles[tool];

    this.shapeStyle.strokeColor = style.strokeColor;
    this.shapeStyle.fillColor = style.fillColor;
    this.shapeStyle.strokeWidth = style.strokeWidth;

    if (tool === WorkshopTools.TEXT) {
      this.textStyle.fillColor = style.fillColor;
    }

    if (tool === WorkshopTools.TEXTURE) {
      this.textureStyle.textureColor = style.strokeColor;
      this.textureStyle.strokeWidth = style.strokeWidth;
    }
  }
}
