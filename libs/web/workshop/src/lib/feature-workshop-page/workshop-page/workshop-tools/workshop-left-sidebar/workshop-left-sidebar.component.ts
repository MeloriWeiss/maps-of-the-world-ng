import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkshopTools } from '../../../../consts';
import { WorkshopToolsService } from '../../../../services';

@Component({
  selector: 'wm-workshop-left-sidebar',
  imports: [],
  templateUrl: './workshop-left-sidebar.component.html',
  styleUrl: './workshop-left-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopLeftSidebarComponent {
  #workshopToolsService = inject(WorkshopToolsService);

  WorkshopTools = WorkshopTools;

  setCurrentTool(newTool: WorkshopTools) {
    this.#workshopToolsService.setCurrentTool(newTool);
  }

  currentTool = this.#workshopToolsService.currentTool;
}
