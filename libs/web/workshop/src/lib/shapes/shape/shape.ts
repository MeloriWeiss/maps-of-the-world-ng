import { BaseShape, CreateBaseShape } from './shape.interface';
import { Bounds, Point } from '../../interfaces';
import {
  editorShapeRenderContext,
  ShapeRenderContext,
} from '../../rendering/shape-render-context';

export abstract class BaseShapeShape implements BaseShape {
  erasures: { x: number; y: number; radius: number }[] = [];
  protected partialErase = false;
  abstract draw(
    ctx: CanvasRenderingContext2D,
    context?: ShapeRenderContext,
  ): void;
  abstract clickOn(point: Point): boolean;
  abstract getBounds(context?: ShapeRenderContext): Bounds;

  render(
    ctx: CanvasRenderingContext2D,
    context: ShapeRenderContext = editorShapeRenderContext,
  ) {
    ctx.save();
    try {
      const bounds = this.getBounds(context);
      for (const hole of this.erasures) {
        ctx.beginPath();
        ctx.rect(
          bounds.x - 1,
          bounds.y - 1,
          bounds.width + 2,
          bounds.height + 2,
        );
        ctx.moveTo(hole.x + hole.radius, hole.y);
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2, true);
        ctx.clip();
      }
      this.draw(ctx, context);
    } finally {
      ctx.restore();
    }
  }

  erase(
    point: Point,
    radius: number,
    objectsOnly = false,
  ): 'none' | 'changed' | 'remove' {
    if (!this.#intersectsEraser(point, radius)) return 'none';
    if (!this.partialErase || objectsOnly) return 'remove';
    if (
      this.erasures.some(
        (hole) =>
          Math.hypot(point.x - hole.x, point.y - hole.y) + radius <=
          hole.radius,
      )
    )
      return 'none';
    this.erasures.push({ ...point, radius });
    return 'changed';
  }

  #intersectsEraser(point: Point, radius: number) {
    const bounds = this.getBounds();
    const closestX = Math.max(
      bounds.x,
      Math.min(point.x, bounds.x + bounds.width),
    );
    const closestY = Math.max(
      bounds.y,
      Math.min(point.y, bounds.y + bounds.height),
    );
    if (Math.hypot(point.x - closestX, point.y - closestY) > radius)
      return false;
    if (this.clickOn(point)) return true;
    for (let i = 0; i < 16; i += 1) {
      const angle = (i * Math.PI) / 8;
      if (
        this.clickOn({
          x: point.x + Math.cos(angle) * radius,
          y: point.y + Math.sin(angle) * radius,
        })
      )
        return true;
    }
    return false;
  }

  protected moveErasures(delta: Point) {
    for (const hole of this.erasures) {
      hole.x += delta.x;
      hole.y += delta.y;
    }
  }

  protected transformErasures(from: Bounds, to: Bounds) {
    const sx = to.width / Math.max(from.width, 0.001);
    const sy = to.height / Math.max(from.height, 0.001);
    for (const hole of this.erasures) {
      hole.x = to.x + (hole.x - from.x) * sx;
      hole.y = to.y + (hole.y - from.y) * sy;
      hole.radius *= Math.sqrt(Math.abs(sx * sy));
    }
  }
  readonly id = crypto.randomUUID();
  objectId?: string;

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

  async prepareRender(
    _context: ShapeRenderContext = editorShapeRenderContext,
  ): Promise<() => void> {
    return () => undefined;
  }

  async whenReady(): Promise<void> {
    const release = await this.prepareRender(editorShapeRenderContext);
    release();
  }
}
