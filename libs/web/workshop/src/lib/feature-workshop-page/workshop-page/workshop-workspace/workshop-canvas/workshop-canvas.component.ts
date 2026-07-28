import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  WorkshopCanvasService,
  WorkshopCanvasSetupFacade,
} from '../../../../services';

@Component({
  selector: 'wm-workshop-canvas',
  imports: [FormsModule],
  templateUrl: './workshop-canvas.component.html',
  styleUrl: './workshop-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopCanvasComponent implements AfterViewInit {
  #workshopCanvasService = inject(WorkshopCanvasService);
  #canvasSetupFacade = inject(WorkshopCanvasSetupFacade);

  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  ngAfterViewInit() {
    const canvasRef = this.canvasRef();
    this.#workshopCanvasService.canvasRef = canvasRef;

    const canvas = canvasRef.nativeElement;
    const canvasContext = canvas.getContext('2d');

    if (!canvasContext) return;

    this.#workshopCanvasService.ctx = canvasContext;

    this.#canvasSetupFacade.setupCanvas();
  }
}
