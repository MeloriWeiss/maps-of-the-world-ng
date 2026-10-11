import { inject } from '@angular/core';
import { Tool } from '../shared';
import { Point } from '../../interfaces';
import { ShapeNode, GraphNode } from '../../nodes';
import { WorkshopShapesService } from '../../services/workshop-shapes.service';
import { WorkshopSceneGraphService } from '../../services/workshop-scene-graph.service';
import { WorkshopSettingsService } from '../../services/workshop-settings.service';
import { WorkshopCanvasManagerService } from '../../services/workshop-canvas-manager.service';
import { WorkshopTools } from '../../consts';
import { canvasColor } from '../../rendering/palette';

export class EraserTool implements Tool {
  static readonly displayName = 'Ластик';
  #shapes = inject(WorkshopShapesService);
  #graph = inject(WorkshopSceneGraphService);
  #settings = inject(WorkshopSettingsService);
  #canvas = inject(WorkshopCanvasManagerService);
  #last: Point | null = null;

  startDrawing(
    _event: MouseEvent,
    ctx: CanvasRenderingContext2D,
    point: Point,
  ) {
    this.#shapes.beginOperation();
    this.#shapes.clearSelection();
    this.#last = point;
    this.draw(ctx, point);
  }

  draw(ctx: CanvasRenderingContext2D, point: Point) {
    const radius = Math.max(
      1,
      this.#settings.toolStyles[WorkshopTools.ERASER].strokeWidth / 2,
    );
    const from = this.#last ?? point;
    const distance = Math.hypot(point.x - from.x, point.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius / 2)));
    for (let i = 1; i <= steps; i++) {
      this.#erase(
        {
          x: from.x + ((point.x - from.x) * i) / steps,
          y: from.y + ((point.y - from.y) * i) / steps,
        },
        radius,
      );
    }
    this.#last = point;
    this.#canvas.redraw();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = canvasColor('--btn-primary-bg-color');
    ctx.lineWidth = 1 / Math.max(0.01, ctx.getTransform().a);
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  stopDrawing() {
    this.#last = null;
    this.#shapes.endOperation();
    this.#shapes.saveChanges();
    this.#canvas.requestRedraw();
  }

  #erase(point: Point, radius: number) {
    const active =
      this.#graph.nodeById(this.#graph.activeNodeId() ?? '') ??
      this.#graph.root();
    const parent = active instanceof ShapeNode ? active.parent : active;
    if (!parent || !parent.visible || parent.locked) return;
    const visit = (node: GraphNode) => {
      if (!node.visible || node.locked) return;
      if (node instanceof ShapeNode) {
        const result = node.shape.erase(
          point,
          radius,
          this.#settings.eraserObjectsOnly,
        );
        if (result === 'remove') this.#graph.removeNode(node.id);
        if (result === 'changed') this.#shapes.markShapeDirty(node.shape);
        return;
      }
      for (const child of [...node.children]) visit(child);
    };
    visit(parent);
  }
}
