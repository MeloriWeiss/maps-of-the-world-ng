import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  WorkshopCanvasManagerService,
  WorkshopShapesService,
} from '../../../../services';
import { firstValueFrom } from 'rxjs';
import { ConfirmationModalComponent, ModalService } from '@wm/web/common-ui';
import { ConfirmModalInputs } from '@wm/web/data-access/shared';

interface EditingLayer {
  id: string | null;
  name: string | null;
}

@Component({
  selector: 'wm-workshop-right-sidebar',
  imports: [],
  templateUrl: './workshop-right-sidebar.component.html',
  styleUrl: './workshop-right-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopRightSidebarComponent {
  #workshopShapesService = inject(WorkshopShapesService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  // #modalService = inject(ModalService);

  // layers = this.#workshopShapesService.layers;
  activeLayerId = this.#workshopShapesService.activeLayerId;
  // layersCount = this.#workshopShapesService.layersCount;
  // layersOrder = this.#workshopShapesService.layersOrder;

  editingLayer: EditingLayer = {
    id: null,
    name: null,
  };

  draggingLayerId: string | null = null;

  addLayer() {
    this.#workshopShapesService.addLayer();
    this.#workshopCanvasManagerService.redraw();
  }

  setActiveLayer(id: string) {
    this.activeLayerId.set(id);

    this.#workshopShapesService.setActiveLayer(id);
  }

  toggleLayerVisibility(id: string) {
    this.#workshopShapesService.toggleLayerVisibility(id);
    this.#workshopCanvasManagerService.redraw();
  }

  async removeLayer(id: string) {
    // const layer = this.layers()[id];
    //
    // if (!layer) return;
    //
    // const result = await firstValueFrom(
    //   this.#modalService.show<boolean, ConfirmModalInputs>(
    //     ConfirmationModalComponent,
    //     {
    //       title: `Удалить слой?`,
    //       subtitle: `Слой "${layer.name}" и все фигуры в нём будут удалены`,
    //     }
    //   )
    // );
    //
    // if (!result) return;
    //
    // this.#workshopShapesService.removeLayer(id);
    // this.#modalService.close();
  }

  startRename(id: string) {
    // const layer = this.layers()[id];
    //
    // if (!layer) return;
    //
    // this.editingLayer = { id, name: layer.name };
  }

  onEditingNameChange(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    this.editingLayer.name = input.value;
  }

  finishRename(id: string) {
    const value = this.editingLayer.name?.trim();

    if (value) {
      this.#workshopShapesService.renameLayer(id, value);
    }

    this.stopEditing();
  }

  stopEditing() {
    this.editingLayer = { id: null, name: null };
  }

  moveLayerUp(id: string) {
    this.#workshopShapesService.moveLayerUp(id);
    this.#workshopCanvasManagerService.redraw();
  }

  moveLayerDown(id: string) {
    this.#workshopShapesService.moveLayerDown(id);
    this.#workshopCanvasManagerService.redraw();
  }

  onLayerDragStart(id: string, event: DragEvent) {
    this.draggingLayerId = id;

    if (!event.dataTransfer) return;

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  }

  onLayerDragOver(event: DragEvent) {
    event.preventDefault();

    if (!event.dataTransfer) return;

    event.dataTransfer.dropEffect = 'move';
  }

  onLayerDrop(targetId: string, event: DragEvent) {
    event.preventDefault();

    const sourceId =
      event.dataTransfer?.getData('text/plain') || this.draggingLayerId;

    if (!sourceId || sourceId === targetId) {
      this.draggingLayerId = null;
      return;
    }

    this.#workshopShapesService.reorderLayer(sourceId, targetId);
    this.#workshopCanvasManagerService.redraw();

    this.draggingLayerId = null;
  }
}
