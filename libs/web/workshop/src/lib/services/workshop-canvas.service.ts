import { ElementRef, Injectable } from '@angular/core';

@Injectable()
export class WorkshopCanvasService {
  canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;
}
