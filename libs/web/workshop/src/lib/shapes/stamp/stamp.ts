import { ShapesTypes } from '../../consts';
import { Bounds, Point } from '../../interfaces';
import { BaseShapeShape, CreateBaseShape, Shape } from '../shape';
import { SelectionRect } from '../../tools/select/selection-rect.interface';
import {
  editorShapeRenderContext,
  ShapeRenderContext,
} from '../../rendering/shape-render-context';
import { intersectsBounds } from '@wm/shared/workshop';

/** Один экземпляр штампа с координатами, размером и углом поворота. */
export interface StampInstance extends Point {
  id?: string;
  width: number;
  height: number;
  rotation: number;
}

/** Данные текстуры штампа и всех её экземпляров. */
export interface StampData extends CreateBaseShape {
  textureId: string;
  textureUrl: string;
  instances: StampInstance[];
}

/** Реализация фигуры, содержащей один или несколько экземпляров штампа. */
export class StampShape extends BaseShapeShape implements Shape {
  type = ShapesTypes.STAMP;
  protected override partialErase = true;
  textureId: string;
  textureUrl: string;
  instances: StampInstance[];

  constructor(data: StampData) {
    super(data, 'Штампы');
    this.textureId = data.textureId;
    this.textureUrl = data.textureUrl;
    this.instances = data.instances.map((instance) => ({
      ...instance,
      id: instance.id ?? crypto.randomUUID(),
    }));
  }

  override prepareRender(
    context: ShapeRenderContext = editorShapeRenderContext,
  ) {
    return context.images.acquire({
      textureId: this.textureId,
      url: this.textureUrl,
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    context: ShapeRenderContext = editorShapeRenderContext,
  ) {
    const matrix = ctx.getTransform();
    const scale = Math.hypot(matrix.a, matrix.b);
    const inverse = matrix.inverse();
    const corner = inverse.transformPoint({ x: 0, y: 0 });
    const end = inverse.transformPoint({
      x: ctx.canvas.width,
      y: ctx.canvas.height,
    });
    const viewport = {
      x: corner.x,
      y: corner.y,
      width: end.x - corner.x,
      height: end.y - corner.y,
    };
    for (const stamp of this.instances) {
      if (!intersectsBounds(this.#bounds(stamp), viewport)) continue;
      const source = context.images.source(
        { textureId: this.textureId, url: this.textureUrl },
        stamp.width * scale,
      );
      if (!source) continue;
      ctx.save();
      ctx.globalAlpha *= this.opacity;
      ctx.translate(stamp.x, stamp.y);
      ctx.rotate((stamp.rotation * Math.PI) / 180);
      ctx.drawImage(
        source,
        -stamp.width / 2,
        -stamp.height / 2,
        stamp.width,
        stamp.height,
      );
      ctx.restore();
    }
  }

  clickOn(point: Point) {
    return this.instances.some((stamp) => {
      const angle = (-stamp.rotation * Math.PI) / 180;
      const dx = point.x - stamp.x;
      const dy = point.y - stamp.y;
      return (
        Math.abs(dx * Math.cos(angle) - dy * Math.sin(angle)) <=
          stamp.width / 2 &&
        Math.abs(dx * Math.sin(angle) + dy * Math.cos(angle)) <=
          stamp.height / 2
      );
    });
  }

  selectByClick(point: Point) {
    return (this.selected = this.clickOn(point));
  }
  selectByDraw(rect: SelectionRect) {
    return (this.selected = this.instances.some((stamp) =>
      intersectsBounds(this.#bounds(stamp), rect),
    ));
  }

  override erase(
    point: Point,
    radius: number,
    objectsOnly = false,
  ): 'none' | 'changed' | 'remove' {
    const intersects = (stamp: StampInstance) => {
      const angle = (-stamp.rotation * Math.PI) / 180;
      const dx = point.x - stamp.x,
        dy = point.y - stamp.y;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const closestX = Math.max(
        -stamp.width / 2,
        Math.min(localX, stamp.width / 2),
      );
      const closestY = Math.max(
        -stamp.height / 2,
        Math.min(localY, stamp.height / 2),
      );
      return Math.hypot(localX - closestX, localY - closestY) <= radius;
    };
    if (!this.instances.some(intersects)) return 'none';
    if (objectsOnly) return 'remove';
    this.instances = this.instances.filter((stamp) => !intersects(stamp));
    return this.instances.length ? 'changed' : 'remove';
  }

  changePosition(delta: Point) {
    for (const stamp of this.instances) {
      stamp.x += delta.x;
      stamp.y += delta.y;
    }
  }

  transform(from: Bounds, to: Bounds) {
    const sx = to.width / Math.max(from.width, 0.001);
    const sy = to.height / Math.max(from.height, 0.001);
    for (const stamp of this.instances) {
      stamp.x = to.x + (stamp.x - from.x) * sx;
      stamp.y = to.y + (stamp.y - from.y) * sy;
      stamp.width *= Math.abs(sx);
      stamp.height *= Math.abs(sy);
    }
  }

  getBounds(): Bounds {
    if (!this.instances.length) return { x: 0, y: 0, width: 0, height: 0 };
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const stamp of this.instances) {
      const b = this.#bounds(stamp);
      left = Math.min(left, b.x);
      top = Math.min(top, b.y);
      right = Math.max(right, b.x + b.width);
      bottom = Math.max(bottom, b.y + b.height);
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  #bounds(stamp: StampInstance): Bounds {
    return this.getInstanceBounds(stamp);
  }

  getInstanceBounds(stamp: StampInstance): Bounds {
    const a = (stamp.rotation * Math.PI) / 180;
    const width =
      Math.abs(stamp.width * Math.cos(a)) +
      Math.abs(stamp.height * Math.sin(a));
    const height =
      Math.abs(stamp.width * Math.sin(a)) +
      Math.abs(stamp.height * Math.cos(a));
    return { x: stamp.x - width / 2, y: stamp.y - height / 2, width, height };
  }
}
