import { BaseShapeShape } from '../shape';
import { Rectangle, RectangleCreateData } from './rectangle.interface';
import { ShapesTypes } from '../../consts';
import { SelectionRect } from '../../tools';
import { Point } from '../../interfaces';

export class RectangleShape extends BaseShapeShape implements Rectangle {
  type = ShapesTypes.RECTANGLE;

  width: number;
  height: number;
  fillColor: string;
  x: number;
  y: number;

  constructor(rect: RectangleCreateData) {
    super({
      strokeColor: rect.strokeColor,
      strokeWidth: rect.strokeWidth,
      opacity: rect.opacity,
    });

    this.width = rect.width;
    this.height = rect.height;
    this.fillColor = rect.fillColor;
    this.x = rect.x;
    this.y = rect.y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = this.strokeWidth;
    ctx.fillStyle = this.fillColor;

    if (this.selected) {
      ctx.strokeStyle = '#0199dc';
    } else {
      ctx.strokeStyle = this.strokeColor;
    }

    ctx.beginPath();
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }

  clickOn(point: Point) {
    const shapeX = this.x;
    const shapeY = this.y;
    const shapeEndX = shapeX + this.width;
    const shapeEndY = shapeY + this.height;

    return (
      point.x > shapeX &&
      point.x < shapeEndX &&
      point.y > shapeY &&
      point.y < shapeEndY
    );
  }

  selectByClick(point: Point) {
    const shapeX = this.x;
    const shapeY = this.y;
    const shapeEndX = shapeX + this.width;
    const shapeEndY = shapeY + this.height;

    if (
      point.x > shapeX &&
      point.x < shapeEndX &&
      point.y > shapeY &&
      point.y < shapeEndY
    ) {
      this.selected = true;
    }

    return this.selected;
  }

  selectByDraw(selectionRect: SelectionRect) {
    const shapeX = this.x;
    const shapeY = this.y;
    const shapeEndX = shapeX + this.width;
    const shapeEndY = shapeY + this.height;

    this.selected =
      shapeX < selectionRect.x + selectionRect.width &&
      shapeEndX > selectionRect.x &&
      shapeY < selectionRect.y + selectionRect.height &&
      shapeEndY > selectionRect.y;

    return this.selected;
  }

  changePosition(point: Point) {
    this.x = this.x + point.x;
    this.y = this.y + point.y;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}
