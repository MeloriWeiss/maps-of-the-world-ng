import { BaseShape, CreateBaseShape } from './shape.interface';

export class BaseShapeShape implements BaseShape {
  readonly id = crypto.randomUUID();

  strokeColor = '#000';
  opacity = 1;
  strokeWidth = 1;
  shadowColor = 'transparent';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;
  selected = false;
  layerId?: string;

  constructor(params: CreateBaseShape) {
    this.strokeColor = params.strokeColor;
    this.opacity = params.opacity;
    this.strokeWidth = params.strokeWidth;
    this.shadowColor = params.shadowColor ?? 'transparent';
    this.shadowBlur = params.shadowBlur ?? 0;
    this.shadowOffsetX = params.shadowOffsetX ?? 0;
    this.shadowOffsetY = params.shadowOffsetY ?? 0;
  }
}
