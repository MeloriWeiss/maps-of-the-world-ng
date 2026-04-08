import { Line, LineCreateData } from './line.interface';
import { BaseShapeShape } from '../shape';
import { ShapesTypes } from '../../consts';
import { Point } from '../../interfaces';
import { SelectionRect } from '../../tools';

export class LineShape extends BaseShapeShape implements Line {
  type = ShapesTypes.LINE;

  points: Point[] = [];

  #selectThreshold = 4;

  constructor(line: LineCreateData) {
    super({
      strokeColor: line.strokeColor,
      strokeWidth: line.strokeWidth,
      opacity: line.opacity,
    });

    this.points = line.points;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = this.strokeWidth;
    ctx.globalAlpha = this.opacity;

    if (this.selected) {
      ctx.strokeStyle = '#0199dc';
    } else {
      ctx.strokeStyle = this.strokeColor;
    }

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
  }

  clickOn(point: Point) {
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      const distance = this.getDistancePointToSegment(
        point.x,
        point.y,
        p1.x,
        p1.y,
        p2.x,
        p2.y,
      );

      if (distance <= this.#selectThreshold) return true;
    }

    return false;
  }

  selectByClick(point: Point) {
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      const distance = this.getDistancePointToSegment(
        point.x,
        point.y,
        p1.x,
        p1.y,
        p2.x,
        p2.y,
      );

      if (distance <= this.#selectThreshold) {
        this.selected = true;
        break;
      } else {
        this.selected = false;
      }
    }

    return this.selected;
  }

  selectByDraw(selectionRect: SelectionRect) {
    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];

      if (lineIntersectsRect(p1.x, p1.y, selectionRect)) {
        this.selected = true;
        break;
      } else {
        this.selected = false;
      }
    }

    function lineIntersectsRect(x1: number, y1: number, rect: SelectionRect) {
      return (
        x1 >= rect.x &&
        x1 <= rect.x + rect.width &&
        y1 >= rect.y &&
        y1 <= rect.y + rect.height
      );
    }

    return this.selected;
  }

  changePosition(point: Point) {
    for (const p of this.points) {
      p.x = p.x + point.x;
      p.y = p.y + point.y;
    }
  }

  getBounds() {
    if (this.points.length === 0) {
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
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  getDistancePointToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) {
    const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;

    if (lineLengthSquared === 0) {
      return Math.hypot(px - x1, py - y1);
    }

    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);

    return Math.hypot(px - closestX, py - closestY);
  }
}
