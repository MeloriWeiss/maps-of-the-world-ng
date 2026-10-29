import { Point } from '../../../interfaces';

/** Контракт инструмента, обрабатывающего начало, ход и завершение рисования. */
export interface Tool {
  startDrawing: (
    e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) => void;
  draw: (ctx: CanvasRenderingContext2D, newPoint: Point) => void;
  stopDrawing: (stopPoint: Point) => void;
  minRequiredParams?: Record<string, unknown>;
  enabledToCreate?: () => boolean;
  dispose?: VoidFunction;
}
