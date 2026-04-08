import { BaseShape } from './shape.interface';

export class BaseShapeShape implements BaseShape {
  id = '';
  strokeColor = '#000';
  opacity = 1;
  strokeWidth = 1;
  selected = false;
  layerId?: string;

  constructor(params: BaseShape) {
    this.id = `shape-${Date.now()}`;
    this.strokeColor = params.strokeColor;
    this.opacity = params.opacity;
    this.strokeWidth = params.strokeWidth;
  }
}
