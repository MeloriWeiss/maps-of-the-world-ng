import { Tool } from '../shared';
import { Point } from '../../interfaces/point.interface';

export class EraserTool implements Tool {
  startDrawing(
    e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) {
    console.log('eraser start');
  }

  draw(ctx: CanvasRenderingContext2D, newPoint: Point) {
    console.log('eraser');
  }

  stopDrawing() {
    console.log('eraser stop');
  }
}
