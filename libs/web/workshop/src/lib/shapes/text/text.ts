import { Text, TextCreateData } from './text.interface';
import { BaseShapeShape } from '../shape';
import { ShapesTypes } from '../../consts';
import { Point } from '../../interfaces';
import { SelectionRect } from '../../tools';

export class TextShape extends BaseShapeShape implements Text {
  type = ShapesTypes.TEXT;

  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fillColor: string;

  constructor(data: TextCreateData) {
    super({
      strokeColor: data.strokeColor,
      strokeWidth: data.strokeWidth,
      opacity: data.opacity,
      shadowColor: data.shadowColor,
      shadowBlur: data.shadowBlur,
      shadowOffsetX: data.shadowOffsetX,
      shadowOffsetY: data.shadowOffsetY,
    });

    this.text = data.text;
    this.x = data.x;
    this.y = data.y;
    this.fontSize = data.fontSize;
    this.fontFamily = data.fontFamily;
    this.fillColor = data.fillColor;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.selected ? '#0199dc' : this.fillColor;
    ctx.shadowColor = this.shadowColor ?? 'transparent';
    ctx.shadowBlur = this.shadowBlur ?? 0;
    ctx.shadowOffsetX = this.shadowOffsetX ?? 0;
    ctx.shadowOffsetY = this.shadowOffsetY ?? 0;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }

  clickOn(point: Point) {
    const bounds = this.getBounds();
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  selectByClick(point: Point) {
    this.selected = this.clickOn(point);
    return this.selected;
  }

  selectByDraw(selectionRect: SelectionRect) {
    const bounds = this.getBounds();
    this.selected =
      bounds.x < selectionRect.x + selectionRect.width &&
      bounds.x + bounds.width > selectionRect.x &&
      bounds.y < selectionRect.y + selectionRect.height &&
      bounds.y + bounds.height > selectionRect.y;
    return this.selected;
  }

  changePosition(point: Point) {
    this.x += point.x;
    this.y += point.y;
  }

  getBounds() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { x: this.x, y: this.y, width: 0, height: 0 };
    }

    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    const metrics = ctx.measureText(this.text);
    const width = metrics.width;
    const height = this.fontSize;

    return {
      x: this.x,
      y: this.y - height,
      width,
      height,
    };
  }
}
