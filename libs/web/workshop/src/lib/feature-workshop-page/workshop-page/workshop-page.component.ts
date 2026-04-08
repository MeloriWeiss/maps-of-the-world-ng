import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkshopToolsComponent } from './workshop-tools/workshop-tools.component';
import {
  WorkshopToolsService,
  WorkshopCoordsService,
  WorkshopDrawService,
  WorkshopPanningService,
  WorkshopSettingsService,
  WorkshopShapesService,
  WorkshopCanvasManagerService,
  WorkshopCanvasService,
  WorkshopQuadtreeService,
} from '../../services';
import { WorkshopShapesStorageService } from '../../services';

@Component({
  selector: 'wm-workshop-page',
  imports: [FormsModule, WorkshopToolsComponent],
  templateUrl: './workshop-page.component.html',
  styleUrl: './workshop-page.component.scss',
  providers: [
    WorkshopDrawService,
    WorkshopSettingsService,
    WorkshopPanningService,
    WorkshopCoordsService,
    WorkshopToolsService,
    WorkshopShapesService,
    WorkshopShapesStorageService,
    WorkshopCanvasManagerService,
    WorkshopCanvasService,
    WorkshopQuadtreeService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopPageComponent {}
