import { Injectable } from '@angular/core';
import { workshopDefaultSettings, WorkshopTools } from '../consts';

export interface WorkshopShapeStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface WorkshopToolStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

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

  readonly toolStyles: Record<WorkshopTools, WorkshopToolStyle> = {
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

  updateToolStyle(
    tool: WorkshopTools,
    patch: Partial<WorkshopToolStyle>,
  ): void {
    Object.assign(this.toolStyles[tool], patch);
  }

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
