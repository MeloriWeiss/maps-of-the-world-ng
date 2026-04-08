import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkshopCanvasComponent } from './workshop-canvas/workshop-canvas.component';

@Component({
  selector: 'wm-workshop-workspace',
  imports: [FormsModule, WorkshopCanvasComponent],
  templateUrl: './workshop-workspace.component.html',
  styleUrl: './workshop-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopWorkspaceComponent {}
