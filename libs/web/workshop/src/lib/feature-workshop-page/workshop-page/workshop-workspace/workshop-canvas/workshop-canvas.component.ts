import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  WorkshopCanvasManagerService,
  WorkshopCanvasService,
  WorkshopDrawService,
  WorkshopPanningService,
  WorkshopShapesService,
} from '../../../../services';
import { firstValueFrom, forkJoin, merge, switchMap } from 'rxjs';

@Component({
  selector: 'wm-workshop-canvas',
  imports: [FormsModule],
  templateUrl: './workshop-canvas.component.html',
  styleUrl: './workshop-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopCanvasComponent implements AfterViewInit {
  #destroyRef = inject(DestroyRef);
  #workshopDrawService = inject(WorkshopDrawService);
  #workshopCanvasService = inject(WorkshopCanvasService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  #workshopPanningService = inject(WorkshopPanningService);
  #workshopShapesService = inject(WorkshopShapesService);

  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    this.handleShapes();
  }

  ngAfterViewInit() {
    const canvasRef = this.canvasRef();

    this.#workshopCanvasService.canvasRef = canvasRef;

    const canvas = canvasRef.nativeElement;
    const canvasContext = canvas.getContext('2d');

    if (!canvasContext) return;

    this.#workshopCanvasService.ctx = canvasContext;

    this.setupCanvas();
    this.listenCanvasEvents();
  }

  handleShapes() {
    firstValueFrom(this.#workshopShapesService.getNodes()).then();

    this.#workshopShapesService.nodesSaves$
      .pipe(takeUntilDestroyed())
      .subscribe();
  }

  setupCanvas() {
    this.#workshopCanvasService.ctx.lineCap = 'round';

    this.#workshopPanningService.prepareCanvas();
  }

  listenCanvasEvents() {
    merge(
      this.#workshopDrawService.listenDrawEvents(),
      this.#workshopPanningService.listenCanvasManagementEvents(),
      this.#workshopCanvasManagerService.listenKeyEvents(),
    )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }
}
