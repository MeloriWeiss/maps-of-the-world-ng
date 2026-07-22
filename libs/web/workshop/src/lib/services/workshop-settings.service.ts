import { Injectable } from '@angular/core';
import { workshopDefaultSettings } from '../consts';

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
    textureColor: '#c4a574',
    textureScale: 1,
    textureRotation: 0,
    strokeWidth: 12,
  };
}
