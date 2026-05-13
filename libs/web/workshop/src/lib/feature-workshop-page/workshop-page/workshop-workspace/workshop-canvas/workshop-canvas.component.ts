import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  WorkshopCanvasService,
  WorkshopCanvasSetupFacade,
  WorkshopSceneGraphService,
} from '../../../../services';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'wm-workshop-canvas',
  imports: [FormsModule],
  templateUrl: './workshop-canvas.component.html',
  styleUrl: './workshop-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopCanvasComponent implements AfterViewInit {
  #workshopCanvasService = inject(WorkshopCanvasService);
  #workshopShapesService = inject(WorkshopSceneGraphService);
  #canvasSetupFacade = inject(WorkshopCanvasSetupFacade);

  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    this.startHandleSceneGraph();
  }

  ngAfterViewInit() {
    const canvasRef = this.canvasRef();
    this.#workshopCanvasService.canvasRef = canvasRef;

    const canvas = canvasRef.nativeElement;
    const canvasContext = canvas.getContext('2d');

    if (!canvasContext) return;

    this.#workshopCanvasService.ctx = canvasContext;

    this.#canvasSetupFacade.setupCanvas();
  }

  startHandleSceneGraph() {
    firstValueFrom(this.#workshopShapesService.getNodes()).then();

    this.#workshopShapesService.nodesSaves$
      .pipe(takeUntilDestroyed())
      .subscribe();
  }
}
