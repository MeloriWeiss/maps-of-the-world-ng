import { inject } from '@angular/core';
import { Tool } from '../shared';
import {
  WorkshopCanvasManagerService,
  WorkshopCoordsService,
  WorkshopShapesService,
} from '../../services';
import { SelectionRect } from './selection-rect.interface';
import { Bounds, Point } from '../../interfaces';
import { Shape } from '../../shapes';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export class SelectTool implements Tool {
  #workshopShapesService = inject(WorkshopShapesService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  #workshopCoordsService = inject(WorkshopCoordsService);

  #selectionRect: SelectionRect | null = null;
  #selectedShapes = new Set<Shape>();
  #isSelecting = false;
  #isMovingSelection = false;
  #resizeHandle: ResizeHandle | null = null;
  #resizeBounds: Bounds | null = null;
  #lastPoint: Point | null = null;

  startDrawing(
    e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) {
    this.#syncSelectedShapes();
    this.#lastPoint = startPoint;

    const resizeHandle = this.#pickResizeHandle(startPoint);
    if (resizeHandle) {
      this.#resizeHandle = resizeHandle;
      this.#resizeBounds = this.#workshopShapesService.getSelectionBounds(
        Array.from(this.#selectedShapes),
      );
      return;
    }

    const hitShape = this.#pickTopShape(startPoint);
    if (hitShape) {
      if (e.shiftKey) {
        this.#setShapeSelected(hitShape, !hitShape.selected);
        if (hitShape.selected) {
          this.#selectedShapes.add(hitShape);
        } else {
          this.#selectedShapes.delete(hitShape);
        }
        this.#syncSelectedShapes();
        this.#workshopShapesService.setSelectedShapes(
          Array.from(this.#selectedShapes),
        );
        this.#workshopCanvasManagerService.redraw();
        return;
      }

      if (!hitShape.selected) {
        this.#clearSelection();
        this.#setShapeSelected(hitShape, true);
        this.#selectedShapes.add(hitShape);
      } else {
        this.#syncSelectedShapes();
      }

      this.#isMovingSelection = true;
      this.#workshopShapesService.setSelectedShapes(
        Array.from(this.#selectedShapes),
      );
      this.#workshopCanvasManagerService.redraw();
      return;
    }

    if (!e.shiftKey) {
      this.#clearSelection();
    }

    this.#isSelecting = true;
    this.#selectionRect = {
      x: startPoint.x,
      y: startPoint.y,
      width: 0,
      height: 0,
    };

    this.#workshopCanvasManagerService.redraw();
  }

  draw(ctx: CanvasRenderingContext2D, newPoint: Point) {
    if (!this.#lastPoint) return;

    if (this.#resizeHandle && this.#resizeBounds) {
      const nextBounds = this.#resizeSelectionBounds(
        this.#resizeBounds,
        newPoint,
        this.#resizeHandle,
      );
      this.#workshopShapesService.transformSelectedShapes(
        this.#resizeBounds,
        nextBounds,
      );
      this.#resizeBounds = nextBounds;
      this.#lastPoint = newPoint;
      this.#workshopCanvasManagerService.redraw();
      return;
    }

    if (this.#isMovingSelection) {
      const delta = {
        x: newPoint.x - this.#lastPoint.x,
        y: newPoint.y - this.#lastPoint.y,
      };

      for (const shape of this.#selectedShapes) {
        shape.changePosition(delta);
        this.#workshopShapesService.markShapeDirty(shape);
      }

      this.#lastPoint = newPoint;
      this.#workshopCanvasManagerService.redraw();
      return;
    }

    if (!this.#isSelecting || !this.#selectionRect) return;

    this.#selectionRect.width = newPoint.x - this.#selectionRect.x;
    this.#selectionRect.height = newPoint.y - this.#selectionRect.y;

    this.#applySelectionRect();
    this.#workshopShapesService.setSelectedShapes(
      Array.from(this.#selectedShapes),
    );
    this.#workshopCanvasManagerService.redraw();
    this.#drawSelectionRect(ctx, this.#selectionRect);
  }

  stopDrawing() {
    this.#workshopShapesService.saveChanges();
    this.#isSelecting = false;
    this.#isMovingSelection = false;
    this.#resizeHandle = null;
    this.#resizeBounds = null;
    this.#lastPoint = null;
    this.#selectionRect = null;
    this.#workshopShapesService.setSelectedShapes(
      Array.from(this.#selectedShapes),
    );
    this.#workshopCanvasManagerService.redraw();
  }

  #pickTopShape(point: Point) {
    const visibleShapes = this.#workshopShapesService.getVisibleShapes();

    for (let i = visibleShapes.length - 1; i >= 0; i--) {
      if (visibleShapes[i].clickOn(point)) {
        return visibleShapes[i];
      }
    }

    return null;
  }

  #clearSelection() {
    this.#workshopShapesService.clearSelection();
    this.#selectedShapes.clear();
    this.#workshopShapesService.setSelectedShapes([]);
  }

  #syncSelectedShapes() {
    this.#selectedShapes = new Set(
      this.#workshopShapesService
        .getVisibleShapes()
        .filter((shape) => shape.selected),
    );
  }

  #applySelectionRect() {
    if (!this.#selectionRect) return;

    const rectX = Math.min(
      this.#selectionRect.x,
      this.#selectionRect.x + this.#selectionRect.width,
    );
    const rectY = Math.min(
      this.#selectionRect.y,
      this.#selectionRect.y + this.#selectionRect.height,
    );
    const selectionRect: SelectionRect = {
      x: rectX,
      y: rectY,
      width: Math.abs(this.#selectionRect.width),
      height: Math.abs(this.#selectionRect.height),
    };

    const visibleShapes = this.#workshopShapesService.getVisibleShapes();
    this.#selectedShapes.clear();

    for (const shape of visibleShapes) {
      const wasSelected = !!shape.selected;
      const selected = shape.selectByDraw(selectionRect);
      if (wasSelected !== selected) {
        this.#workshopShapesService.markShapeDirty(shape);
      }
      if (selected) {
        this.#selectedShapes.add(shape);
      }
    }
  }

  #setShapeSelected(shape: Shape, selected: boolean) {
    if (shape.selected === selected) return;
    shape.selected = selected;
    this.#workshopShapesService.markShapeDirty(shape);
  }

  #drawSelectionRect(
    ctx: CanvasRenderingContext2D,
    selectionRect: SelectionRect,
  ) {
    const rectX = Math.min(
      selectionRect.x,
      selectionRect.x + selectionRect.width,
    );
    const rectY = Math.min(
      selectionRect.y,
      selectionRect.y + selectionRect.height,
    );
    const rectWidth = Math.abs(selectionRect.width);
    const rectHeight = Math.abs(selectionRect.height);

    ctx.strokeStyle = '#0199dc';
    ctx.fillStyle = '#16B7FF11';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    ctx.setLineDash([]);
  }

  #pickResizeHandle(point: Point): ResizeHandle | null {
    const bounds = this.#workshopShapesService.getSelectionBounds(
      Array.from(this.#selectedShapes),
    );
    if (!bounds) return null;

    const tolerance = 7 / this.#workshopCoordsService.zoom;
    const handles: Array<[ResizeHandle, number, number]> = [
      ['nw', bounds.x, bounds.y],
      ['n', bounds.x + bounds.width / 2, bounds.y],
      ['ne', bounds.x + bounds.width, bounds.y],
      ['e', bounds.x + bounds.width, bounds.y + bounds.height / 2],
      ['se', bounds.x + bounds.width, bounds.y + bounds.height],
      ['s', bounds.x + bounds.width / 2, bounds.y + bounds.height],
      ['sw', bounds.x, bounds.y + bounds.height],
      ['w', bounds.x, bounds.y + bounds.height / 2],
    ];

    return (
      handles.find(
        ([, x, y]) =>
          Math.abs(point.x - x) <= tolerance &&
          Math.abs(point.y - y) <= tolerance,
      )?.[0] ?? null
    );
  }

  #resizeSelectionBounds(
    bounds: Bounds,
    point: Point,
    handle: ResizeHandle,
  ): Bounds {
    let left = bounds.x;
    let top = bounds.y;
    let right = bounds.x + bounds.width;
    let bottom = bounds.y + bounds.height;
    const minSize = 2 / this.#workshopCoordsService.zoom;

    if (handle.includes('w')) left = Math.min(point.x, right - minSize);
    if (handle.includes('e')) right = Math.max(point.x, left + minSize);
    if (handle.includes('n')) top = Math.min(point.y, bottom - minSize);
    if (handle.includes('s')) bottom = Math.max(point.y, top + minSize);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }
}
