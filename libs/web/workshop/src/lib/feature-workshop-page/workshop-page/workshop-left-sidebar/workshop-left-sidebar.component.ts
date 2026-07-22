import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkshopTools } from '../../../consts';
import { WorkshopToolsService } from '../../../services';
import { SvgComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-workshop-left-sidebar',
  imports: [SvgComponent],
  templateUrl: './workshop-left-sidebar.component.html',
  styleUrl: './workshop-left-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopLeftSidebarComponent {
  #workshopToolsService = inject(WorkshopToolsService);

  currentToolName = this.#workshopToolsService.currentToolName;

  WorkshopTools = WorkshopTools;

  setCurrentTool(newTool: WorkshopTools) {
    this.#workshopToolsService.setCurrentTool(newTool);
  }
}
