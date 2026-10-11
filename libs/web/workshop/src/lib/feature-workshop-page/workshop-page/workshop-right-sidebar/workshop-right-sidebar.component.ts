import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkshopObjectsPanelComponent } from './workshop-objects-panel.component';
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
  imports: [
    WorkshopObjectsPanelComponent,
    WorkshopNodesPanelComponent,
    FormsModule,
  ],
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
  panelMode = signal<'objects' | 'layers'>('objects');
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
    this.#shapesService.beginOperation();
    this.#sceneGraphService.addLayerNode({});
    this.#shapesService.endOperation();
    this.panelMode.set('layers');
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
    this.#shapesService.beginOperation();
    this.#sceneGraphService.addGroupNode();
    this.#shapesService.endOperation();
    this.panelMode.set('layers');
  }

  closeProperties() {
    this.#shapesService.clearSelection();
  }

  updateSelectedShape(key: 'width' | 'height', value: string | number) {
    const shape = this.selectedRectangle;
    if (!shape) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;

    this.#shapesService.beginOperation();
    shape[key] = number;
    this.#shapesService.markShapeDirty(shape);
    this.#shapesService.saveChanges();
    this.#shapesService.endOperation();
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

    this.#shapesService.beginOperation();
    for (const shape of this.selectedShapes()) {
      Object.assign(shape, { [key]: parsedValue });
      this.#shapesService.markShapeDirty(shape);
    }
    this.#shapesService.saveChanges();
    this.#shapesService.endOperation();
    this.#canvasManager.requestRedraw();
  }

  updateSelectedShapesFill(value: string) {
    this.#shapesService.beginOperation();
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
    this.#shapesService.endOperation();
    this.#canvasManager.requestRedraw();
  }

  updateShapeFromNumberInput(shape: Shape, key: keyof Shape, value: string) {
    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) return;

    this.#shapesService.beginOperation();
    this.#shapesService.updateShape(shape, {
      [key]: parsedValue,
    } as Partial<Shape>);
    this.#shapesService.endOperation();
    this.#canvasManager.requestRedraw();
  }
}
