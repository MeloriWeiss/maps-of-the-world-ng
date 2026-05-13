import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ShapesTypes } from '../../../consts';
import { Rectangle, Shape } from '../../../shapes';
import { WorkshopNodesPanelComponent } from './workshop-nodes-panel/workshop-nodes-panel.component';
import {
  WorkshopCanvasManagerService,
  WorkshopSceneGraphService,
  WorkshopSceneGraphStorageService,
  WorkshopShapesService,
} from '../../../services';
@Component({
  selector: 'wm-workshop-right-sidebar',
  imports: [WorkshopNodesPanelComponent, FormsModule],
  templateUrl: './workshop-right-sidebar.component.html',
  styleUrl: './workshop-right-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopRightSidebarComponent {
  #sceneGraphStorageService = inject(WorkshopSceneGraphStorageService);
  #sceneGraphService = inject(WorkshopSceneGraphService);
  #shapesService = inject(WorkshopShapesService);
  #canvasManager = inject(WorkshopCanvasManagerService);

  nodesRoot = this.#sceneGraphStorageService.nodesRoot;
  activeNodeId = this.#sceneGraphStorageService.activeNodeId;
  selectedShape = this.#shapesService.selectedShape;

  activeNodesList = signal(true);

  get selectedRectangle(): Rectangle | null {
    const shape = this.selectedShape();
    if (!shape || shape.type !== ShapesTypes.RECTANGLE) return null;
    return shape as Rectangle;
  }

  addLayer() {
    this.#sceneGraphService.addLayerNode({});
  }

  addGroup() {
    this.#sceneGraphService.addGroupNode();
  }

  updateSelectedShape() {
    const shape = this.selectedShape();
    if (!shape) return;

    this.#shapesService.markShapeDirty(shape);
    this.#shapesService.saveChanges();
    this.#canvasManager.requestRedraw();
  }

  updateShapeFromNumberInput(shape: Shape, key: keyof Shape, value: string) {
    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) return;

    this.#shapesService.updateShape(shape, {
      [key]: parsedValue,
    } as Partial<Shape>);
    this.#canvasManager.requestRedraw();
  }

  generateTestData() {
    this.activeNodesList.set(false);
    this.#sceneGraphStorageService.generateRandomShapesInMemory(50000);
  }

  toggleMode() {
    const on = this.#canvasManager.useOffscreen();
    this.#canvasManager.useOffscreen.set(!on);
  }
}
