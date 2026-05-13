import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  WorkshopToolsService,
  WorkshopCoordsService,
  WorkshopDrawService,
  WorkshopSettingsService,
  WorkshopSceneGraphService,
  WorkshopCanvasManagerService,
  WorkshopCanvasService,
  WorkshopQuadtreeService,
  WorkshopShapesService,
  WorkshopCanvasSizeService,
  WorkshopPanningService,
  WorkshopCanvasSetupFacade,
} from '../../services';
import { WorkshopSceneGraphStorageService } from '../../services';
import { WorkshopWorkspaceComponent } from './workshop-workspace/workshop-workspace.component';
import { WorkshopLeftSidebarComponent } from './workshop-left-sidebar/workshop-left-sidebar.component';
import { WorkshopRightSidebarComponent } from './workshop-right-sidebar/workshop-right-sidebar.component';
import { WorkshopHeaderComponent } from './workshop-header/workshop-header.component';

@Component({
  selector: 'wm-workshop-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    WorkshopLeftSidebarComponent,
    WorkshopRightSidebarComponent,
    WorkshopWorkspaceComponent,
    WorkshopRightSidebarComponent,
    WorkshopHeaderComponent,
  ],
  templateUrl: './workshop-page.component.html',
  styleUrl: './workshop-page.component.scss',
  providers: [
    WorkshopDrawService,
    WorkshopSettingsService,
    WorkshopCoordsService,
    WorkshopToolsService,
    WorkshopSceneGraphService,
    WorkshopSceneGraphStorageService,
    WorkshopCanvasManagerService,
    WorkshopCanvasService,
    WorkshopQuadtreeService,
    WorkshopShapesService,
    WorkshopCanvasSizeService,
    WorkshopPanningService,
    WorkshopCanvasSetupFacade,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopPageComponent implements AfterViewInit {
  #canvasSizeService = inject(WorkshopCanvasSizeService);

  header = viewChild.required(WorkshopHeaderComponent, { read: ElementRef });
  leftSidebar = viewChild.required(WorkshopLeftSidebarComponent, {
    read: ElementRef,
  });
  rightSidebar = viewChild.required(WorkshopRightSidebarComponent, {
    read: ElementRef,
  });

  ngAfterViewInit() {
    this.#canvasSizeService.headerHeight = (
      this.header().nativeElement as HTMLElement
    ).getBoundingClientRect().height;

    this.#canvasSizeService.leftSidebarWidth = (
      this.leftSidebar().nativeElement as HTMLElement
    ).getBoundingClientRect().width;

    this.#canvasSizeService.rightSidebarWidth = (
      this.rightSidebar().nativeElement as HTMLElement
    ).getBoundingClientRect().width;

    this.#canvasSizeService.resizeCanvas();
  }
}
