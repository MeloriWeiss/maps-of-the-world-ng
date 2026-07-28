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
  WorkshopWorldGeneratorService,
  WorkshopMapPersistenceService,
  WorkshopTexturesService,
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
    WorkshopWorldGeneratorService,
    WorkshopMapPersistenceService,
    WorkshopTexturesService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopPageComponent implements AfterViewInit {
  #canvasSizeService = inject(WorkshopCanvasSizeService);
  #panningService = inject(WorkshopPanningService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);
  #canvasSetupFacade = inject(WorkshopCanvasSetupFacade);

  isReady = this.#canvasSetupFacade.isReady;
  loadingMessage = this.#canvasSetupFacade.loadingMessage;

  header = viewChild.required(WorkshopHeaderComponent, { read: ElementRef });
  leftSidebar = viewChild.required(WorkshopLeftSidebarComponent, {
    read: ElementRef,
  });
  rightSidebar = viewChild.required(WorkshopRightSidebarComponent, {
    read: ElementRef,
  });

  async ngAfterViewInit() {
    await this.#canvasSetupFacade.waitUntilCanvasSetup();

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
    await this.#canvasSetupFacade.waitUntilMapReady();

    await this.#renderInitialFrame();
    this.#canvasSetupFacade.finishInitialization();
  }

  #renderInitialFrame(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        this.#panningService.fitContent();
        this.#canvasManagerService.redraw();

        requestAnimationFrame(() => resolve());
      });
    });
  }
}
