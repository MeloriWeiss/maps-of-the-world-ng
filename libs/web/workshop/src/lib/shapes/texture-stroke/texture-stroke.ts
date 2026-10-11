import {
  TextureStroke,
  TextureStrokeCreateData,
} from './texture-stroke.interface';
import { BaseShapeShape } from '../shape';
import { ShapesTypes } from '../../consts';
import { Bounds, Point } from '../../interfaces';
import {
  editorShapeRenderContext,
  ShapeRenderContext,
} from '../../rendering/shape-render-context';
import { SelectionRect } from '../../tools';

export class TextureStrokeShape
  extends BaseShapeShape
  implements TextureStroke
{
  type = ShapesTypes.TEXTURE;

  protected override partialErase = true;
  points: Point[] = [];
  textureId: string | null;
  textureUrl: string | null;
  textureScale: number;
  textureRotation: number;
  textureColor: string;

  #selectThreshold = 6;
  constructor(data: TextureStrokeCreateData) {
    super(
      {
        name: data.name,
        strokeColor: data.strokeColor,
        strokeWidth: data.strokeWidth,
        opacity: data.opacity,
        shadowColor: data.shadowColor,
        shadowBlur: data.shadowBlur,
        shadowOffsetX: data.shadowOffsetX,
        shadowOffsetY: data.shadowOffsetY,
      },
      'Текстура',
    );

    this.points = data.points;
    this.textureId = data.textureId;
    this.textureUrl = data.textureUrl;
    this.textureScale = data.textureScale;
    this.textureRotation = data.textureRotation;
    this.textureColor = data.textureColor;
  }

  override prepareRender(
    context: ShapeRenderContext = editorShapeRenderContext,
  ): Promise<() => void> {
    if (!this.textureUrl) return Promise.resolve(() => undefined);
    return context.images.acquire({
      textureId: this.textureId,
      url: this.textureUrl,
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    context: ShapeRenderContext = editorShapeRenderContext,
  ) {
    if (!this.points.length) return;

    ctx.save();
    ctx.globalAlpha *= this.opacity;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pattern = this.#createPattern(ctx, context);
    ctx.strokeStyle = pattern ?? context.color(this.textureColor);

    if (this.selected) {
      ctx.strokeStyle = context.color('--btn-primary-bg-color');
    }

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    if (this.points.length === 1) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.arc(
        this.points[0].x,
        this.points[0].y,
        this.strokeWidth / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else ctx.stroke();
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
    this.moveErasures(point);
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

    return {
      x: minX - this.strokeWidth / 2,
      y: minY - this.strokeWidth / 2,
      width: maxX - minX + this.strokeWidth,
      height: maxY - minY + this.strokeWidth,
    };
  }

  transform(from: Bounds, to: Bounds) {
    this.transformErasures(from, to);
    for (const point of this.points) {
      point.x =
        to.x + ((point.x - from.x) / Math.max(from.width, 0.001)) * to.width;
      point.y =
        to.y + ((point.y - from.y) / Math.max(from.height, 0.001)) * to.height;
    }

    const scaleX = to.width / Math.max(from.width, 0.001);
    const scaleY = to.height / Math.max(from.height, 0.001);
    this.textureScale *= Math.max(
      0.05,
      (Math.abs(scaleX) + Math.abs(scaleY)) / 2,
    );
  }

  #createPattern(ctx: CanvasRenderingContext2D, context: ShapeRenderContext) {
    if (!this.textureUrl) return null;
    const source = context.images.source(
      { textureId: this.textureId, url: this.textureUrl },
      Infinity,
    );
    if (!source) return null;
    const pattern = ctx.createPattern(source, 'repeat');
    if (pattern) {
      pattern.setTransform(
        new DOMMatrix()
          .rotate(this.textureRotation)
          .scale(this.textureScale, this.textureScale),
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
