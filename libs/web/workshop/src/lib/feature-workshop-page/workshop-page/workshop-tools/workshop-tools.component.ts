import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkshopWorkspaceComponent } from '../workshop-workspace/workshop-workspace.component';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import {
  WorkshopCanvasManagerService,
  WorkshopDrawService,
} from '../../../services';
import { WorkshopLeftSidebarComponent } from './workshop-left-sidebar/workshop-left-sidebar.component';
import { WorkshopRightSidebarComponent } from './workshop-right-sidebar/workshop-right-sidebar.component';

@Component({
  selector: 'wm-workshop-tools',
  imports: [
    WorkshopWorkspaceComponent,
    ReactiveFormsModule,
    FormsModule,
    WorkshopLeftSidebarComponent,
    WorkshopRightSidebarComponent,
  ],
  templateUrl: './workshop-tools.component.html',
  styleUrl: './workshop-tools.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopToolsComponent {
  #workshopDrawService = inject(WorkshopDrawService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);

  drawSetupForm = new FormGroup({
    strokeColor: new FormControl(this.#workshopDrawService.strokeColor),
    lineWidth: new FormControl(this.#workshopDrawService.lineWidth),
    opacity: new FormControl(this.#workshopDrawService.opacity),
  });

  constructor() {
    this.drawSetupForm.valueChanges
      .pipe(
        takeUntilDestroyed(),
        tap((value) => {
          if (value.strokeColor)
            this.#workshopDrawService.strokeColor = value.strokeColor;
          if (value.lineWidth)
            this.#workshopDrawService.lineWidth = value.lineWidth;
          if (value.opacity) this.#workshopDrawService.opacity = value.opacity;
        }),
      )
      .subscribe();
  }

  clearCanvas() {
    this.#workshopCanvasManagerService.clearCanvas();
  }
}
