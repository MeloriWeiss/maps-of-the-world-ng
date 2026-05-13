import { inject } from '@angular/core';
import { Tool } from '../shared';
import {
  WorkshopCanvasManagerService,
  WorkshopShapesService,
} from '../../services';
import { SelectionRect } from './selection-rect.interface';
import { Point } from '../../interfaces';
import { Shape } from '../../shapes';

export class SelectTool implements Tool {
  #workshopShapesService = inject(WorkshopShapesService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);

  #selectionRect: SelectionRect | null = null;
  #selectedShapes = new Set<Shape>();
  #isSelecting = false;
  #isMovingSelection = false;
  #lastPoint: Point | null = null;

  startDrawing(
    e: MouseEvent,
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
  ) {
    this.#lastPoint = startPoint;

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
}
