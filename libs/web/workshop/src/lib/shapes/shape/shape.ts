import { BaseShape, CreateBaseShape } from './shape.interface';

export class BaseShapeShape implements BaseShape {
  readonly id = crypto.randomUUID();

  name?: string;
  strokeColor = '#000';
  opacity = 1;
  strokeWidth = 1;
  shadowColor = 'transparent';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;
  selected = false;
  layerId?: string;
  minZoom = 0;
  maxZoom = Number.POSITIVE_INFINITY;
  mapObjectType?: string;

  constructor(params: CreateBaseShape, defaultName = 'Фигура') {
    this.name = params.name ?? defaultName;
    this.strokeColor = params.strokeColor;
    this.opacity = params.opacity;
    this.strokeWidth = params.strokeWidth;
    this.shadowColor = params.shadowColor ?? 'transparent';
    this.shadowBlur = params.shadowBlur ?? 0;
    this.shadowOffsetX = params.shadowOffsetX ?? 0;
    this.shadowOffsetY = params.shadowOffsetY ?? 0;
  }
}
