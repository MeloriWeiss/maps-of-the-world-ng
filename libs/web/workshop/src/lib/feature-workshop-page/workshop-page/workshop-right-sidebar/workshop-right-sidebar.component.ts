import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ShapesTypes } from '../../../consts';
import { Rectangle, Shape } from '../../../shapes';
import { WorkshopNodesPanelComponent } from './workshop-nodes-panel/workshop-nodes-panel.component';
import {
  WorkshopCanvasManagerService,
  WorkshopCanvasSizeService,
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
  #canvasSizeService = inject(WorkshopCanvasSizeService);
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  nodesRoot = this.#sceneGraphStorageService.nodesRoot;
  activeNodeId = this.#sceneGraphStorageService.activeNodeId;
  selectedShape = this.#shapesService.selectedShape;
  selectedShapes = this.#shapesService.selectedShapes;
  ShapesTypes = ShapesTypes;

  activeNodesList = signal(true);
  collapsed = signal(false);

  @HostBinding('class.collapsed')
  get isCollapsed() {
    return this.collapsed();
  }

  get selectedRectangle(): Rectangle | null {
    const shape = this.selectedShape();
    if (!shape || shape.type !== ShapesTypes.RECTANGLE) return null;
    return shape as Rectangle;
  }

  addLayer() {
    this.#sceneGraphService.addLayerNode({});
  }

  toggleSidebar() {
    this.collapsed.update((value) => !value);

    setTimeout(() => {
      this.#canvasSizeService.rightSidebarWidth =
        this.#elementRef.nativeElement.getBoundingClientRect().width;
      this.#canvasSizeService.resizeCanvas();
    }, 220);
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

  updateSelectedShapesProperty(
    key:
      | 'strokeColor'
      | 'strokeWidth'
      | 'opacity'
      | 'shadowColor'
      | 'shadowBlur'
      | 'shadowOffsetX'
      | 'shadowOffsetY',
    value: string | number,
  ) {
    const parsedValue =
      typeof value === 'number' || key.endsWith('Color')
        ? value
        : Number(value);
    if (typeof parsedValue === 'number' && Number.isNaN(parsedValue)) return;

    for (const shape of this.selectedShapes()) {
      Object.assign(shape, { [key]: parsedValue });
      this.#shapesService.markShapeDirty(shape);
    }
    this.#shapesService.saveChanges();
    this.#canvasManager.requestRedraw();
  }

  updateSelectedShapesFill(value: string) {
    for (const shape of this.selectedShapes()) {
      if ('fillColor' in shape) {
        Object.assign(shape, { fillColor: value });
      }
      if ('textureColor' in shape) {
        Object.assign(shape, { textureColor: value });
      }
      this.#shapesService.markShapeDirty(shape);
    }
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
