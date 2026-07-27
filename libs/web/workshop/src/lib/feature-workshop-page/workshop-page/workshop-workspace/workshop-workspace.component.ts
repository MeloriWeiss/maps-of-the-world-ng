import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkshopCanvasComponent } from './workshop-canvas/workshop-canvas.component';
import { WorkshopCanvasManagerService } from '../../../services';
import { WorkshopPanningService } from '../../../services';

@Component({
  selector: 'wm-workshop-workspace',
  imports: [FormsModule, WorkshopCanvasComponent],
  templateUrl: './workshop-workspace.component.html',
  styleUrl: './workshop-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopWorkspaceComponent {
  #canvasManager = inject(WorkshopCanvasManagerService);
  #panningService = inject(WorkshopPanningService);

  showGrid = this.#canvasManager.showGrid;
  zoomPercent = this.#panningService.zoomPercent;
  zoomSliderPosition = this.#panningService.zoomSliderPosition;

  updateZoomSlider(value: number) {
    this.#panningService.setZoomSliderPosition(Number(value));
  }

  fitWorld() {
    this.#panningService.fitWorld();
  }

  toggleGrid(event: Event) {
    const input = event.target as HTMLInputElement;
    this.showGrid.set(input.checked);
    this.#canvasManager.requestRedraw();
  }
}
