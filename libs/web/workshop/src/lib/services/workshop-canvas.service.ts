import { ElementRef, Injectable } from '@angular/core';

/** Предоставляет доступ к холсту и его контексту отрисовки. */
@Injectable()
export class WorkshopCanvasService {
  canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;

  /**
   * Настраивает общие параметры контекста холста.
   */
  setup() {
    this.ctx.lineCap = 'round';
  }
}
