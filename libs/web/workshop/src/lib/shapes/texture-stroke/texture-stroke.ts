import {
  TextureStroke,
  TextureStrokeCreateData,
} from './texture-stroke.interface';
import { BaseShapeShape } from '../shape';
import { ShapesTypes } from '../../consts';
import { Point } from '../../interfaces';
import { SelectionRect } from '../../tools';

export class TextureStrokeShape
  extends BaseShapeShape
  implements TextureStroke
{
  type = ShapesTypes.TEXTURE;

  points: Point[] = [];
  textureScale: number;
  textureRotation: number;
  textureColor: string;

  #selectThreshold = 6;

  constructor(data: TextureStrokeCreateData) {
    super({
      strokeColor: data.strokeColor,
      strokeWidth: data.strokeWidth,
      opacity: data.opacity,
      shadowColor: data.shadowColor,
      shadowBlur: data.shadowBlur,
      shadowOffsetX: data.shadowOffsetX,
      shadowOffsetY: data.shadowOffsetY,
    });

    this.points = data.points;
    this.textureScale = data.textureScale;
    this.textureRotation = data.textureRotation;
    this.textureColor = data.textureColor;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.lineWidth = this.strokeWidth * this.textureScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pattern = this.#createPattern(ctx);
    ctx.strokeStyle = pattern ?? this.textureColor;

    if (this.selected) {
      ctx.strokeStyle = '#0199dc';
    }

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  clickOn(point: Point) {
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      if (
        this.#distanceToSegment(point.x, point.y, p1.x, p1.y, p2.x, p2.y) <=
        this.#selectThreshold
      ) {
        return true;
      }
    }
    return false;
  }

  selectByClick(point: Point) {
    this.selected = this.clickOn(point);
    return this.selected;
  }

  selectByDraw(selectionRect: SelectionRect) {
    for (const p of this.points) {
      if (
        p.x >= selectionRect.x &&
        p.x <= selectionRect.x + selectionRect.width &&
        p.y >= selectionRect.y &&
        p.y <= selectionRect.y + selectionRect.height
      ) {
        this.selected = true;
        return true;
      }
    }
    this.selected = false;
    return false;
  }

  changePosition(point: Point) {
    for (const p of this.points) {
      p.x += point.x;
      p.y += point.y;
    }
  }

  getBounds() {
    if (!this.points.length) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = this.points[0].x;
    let maxX = this.points[0].x;
    let minY = this.points[0].y;
    let maxY = this.points[0].y;

    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  #createPattern(ctx: CanvasRenderingContext2D) {
    const size = Math.max(8, Math.round(16 * this.textureScale));
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const tileCtx = tile.getContext('2d');
    if (!tileCtx) return null;

    tileCtx.fillStyle = this.textureColor;
    tileCtx.fillRect(0, 0, size, size);
    tileCtx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 6; i++) {
      tileCtx.beginPath();
      tileCtx.arc(
        Math.random() * size,
        Math.random() * size,
        Math.random() * size * 0.3,
        0,
        Math.PI * 2,
      );
      tileCtx.fill();
    }

    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern && this.textureRotation) {
      pattern.setTransform(
        new DOMMatrix().rotate(this.textureRotation * (Math.PI / 180)),
      );
    }
    return pattern;
  }

  #distanceToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) {
    const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (lineLengthSquared === 0) return Math.hypot(px - x1, py - y1);

    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;
    t = Math.max(0, Math.min(1, t));
    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);
    return Math.hypot(px - closestX, py - closestY);
  }
}
