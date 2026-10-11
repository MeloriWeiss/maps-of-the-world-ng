import { inject } from '@angular/core';
import { Tool } from '../shared';
import { Point } from '../../interfaces';
import { StampShape } from '../../shapes/stamp/stamp';
import { WorkshopSettingsService } from '../../services/workshop-settings.service';
import { WorkshopShapesService } from '../../services/workshop-shapes.service';
import { WorkshopCanvasManagerService } from '../../services/workshop-canvas-manager.service';
import { workshopImages } from '../../rendering/image-cache';
import { mapCellOf } from '@wm/shared/workshop';

export class StampTool implements Tool {
  static readonly displayName = 'Изображения';
  #settings = inject(WorkshopSettingsService);
  #shapes = inject(WorkshopShapesService);
  #canvas = inject(WorkshopCanvasManagerService);
  #stroke: StampShape | null = null;
  #last: Point | null = null;
  #remaining = 0;
  #timer: ReturnType<typeof setInterval> | null = null;

  startDrawing(
    _event: MouseEvent,
    ctx: CanvasRenderingContext2D,
    point: Point,
  ) {
    const style = this.#settings.stampStyle;
    if (!style.textureId || !style.textureUrl) return;
    this.#shapes.beginOperation();
    this.#stroke = new StampShape({
      ...this.#settings.shapeStyle,
      textureId: style.textureId,
      textureUrl: style.textureUrl,
      instances: [],
    });
    this.#last = point;
    this.#remaining = this.#step();
    this.#place(point);
    this.#preview(ctx);
    if (style.mode === 'time') {
      this.#timer = setInterval(
        () => {
          if (!this.#last) return;
          this.#place(this.#last);
          this.#preview(ctx);
        },
        Math.max(40, style.interval),
      );
    }
  }

  draw(ctx: CanvasRenderingContext2D, point: Point) {
    if (!this.#stroke || !this.#last) return;
    if (this.#settings.stampStyle.mode === 'distance') {
      let from = this.#last;
      let distance = Math.hypot(point.x - from.x, point.y - from.y);
      while (distance >= this.#remaining && distance > 0) {
        const ratio = this.#remaining / distance;
        from = {
          x: from.x + (point.x - from.x) * ratio,
          y: from.y + (point.y - from.y) * ratio,
        };
        this.#place(from);
        distance = Math.hypot(point.x - from.x, point.y - from.y);
        this.#remaining = this.#step();
      }
      this.#remaining -= distance;
    }
    this.#last = point;
    this.#preview(ctx);
  }

  stopDrawing() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    const stroke = this.#stroke;
    if (stroke?.instances.length) {
      const groups = new Map<string, typeof stroke.instances>();
      for (const instance of stroke.instances) {
        const key = `${mapCellOf(instance.x)}:${mapCellOf(instance.y)}`;
        const bucket = groups.get(key) ?? [];
        bucket.push(instance);
        groups.set(key, bucket);
      }
      for (const instances of groups.values())
        for (let offset = 0; offset < instances.length; offset += 256) {
          const part = new StampShape({
            ...stroke,
            instances: instances.slice(offset, offset + 256),
          });
          part.objectId = stroke.id;
          this.#shapes.createShape(part);
        }
    }
    this.#stroke = null;
    this.#last = null;
    this.#shapes.endOperation();
    this.#canvas.requestRedraw();
  }

  dispose() {
    this.stopDrawing();
  }

  #step() {
    return Math.max(
      1,
      this.#settings.stampStyle.width * this.#settings.stampStyle.spacing,
    );
  }

  #place(point: Point) {
    if (!this.#stroke) return;
    const style = this.#settings.stampStyle;
    const random = () => Math.random() * 2 - 1;
    const width = style.width * (1 + random() * style.sizeVariation);
    const image = workshopImages.load(this.#stroke.textureUrl).image;
    const aspect = image.naturalWidth
      ? image.naturalHeight / image.naturalWidth
      : style.aspect;
    this.#stroke.instances.push({
      id: crypto.randomUUID(),
      x: point.x + random() * style.scatter * style.width,
      y: point.y + random() * style.scatter * style.width,
      width,
      height: width * aspect,
      rotation: style.rotation + random() * style.rotationVariation,
    });
  }

  #preview(ctx: CanvasRenderingContext2D) {
    this.#canvas.redraw();
    this.#stroke?.render(ctx);
  }
}
