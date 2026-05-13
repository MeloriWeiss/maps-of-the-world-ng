import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  WorkshopCanvasManagerService,
  WorkshopDrawService,
  WorkshopSettingsService,
} from '../../../services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

@Component({
  selector: 'wm-workshop-header',
  imports: [ReactiveFormsModule],
  templateUrl: './workshop-header.component.html',
  styleUrl: './workshop-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopHeaderComponent {
  #workshopDrawService = inject(WorkshopDrawService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  #workshopSettingsService = inject(WorkshopSettingsService);

  drawSetupForm = new FormGroup({
    strokeColor: new FormControl(this.#workshopDrawService.strokeColor),
    fillColor: new FormControl(
      this.#workshopSettingsService.shapeStyle.fillColor,
    ),
    lineWidth: new FormControl(this.#workshopDrawService.lineWidth),
    opacity: new FormControl(this.#workshopDrawService.opacity),
    shadowColor: new FormControl(
      this.#workshopSettingsService.shapeStyle.shadowColor,
    ),
    shadowBlur: new FormControl(
      this.#workshopSettingsService.shapeStyle.shadowBlur,
    ),
    shadowOffsetX: new FormControl(
      this.#workshopSettingsService.shapeStyle.shadowOffsetX,
    ),
    shadowOffsetY: new FormControl(
      this.#workshopSettingsService.shapeStyle.shadowOffsetY,
    ),
  });

  constructor() {
    this.drawSetupForm.valueChanges
      .pipe(
        tap((value) => {
          if (value.strokeColor)
            this.#workshopDrawService.strokeColor = value.strokeColor;
          if (value.fillColor)
            this.#workshopSettingsService.shapeStyle.fillColor =
              value.fillColor;
          if (value.lineWidth !== null && value.lineWidth !== undefined)
            this.#workshopDrawService.lineWidth = value.lineWidth;
          if (value.opacity !== null && value.opacity !== undefined)
            this.#workshopDrawService.opacity = value.opacity;
          if (value.strokeColor) {
            this.#workshopSettingsService.shapeStyle.strokeColor =
              value.strokeColor;
          }
          if (value.lineWidth !== null && value.lineWidth !== undefined) {
            this.#workshopSettingsService.shapeStyle.strokeWidth =
              value.lineWidth;
          }
          if (value.opacity !== null && value.opacity !== undefined) {
            this.#workshopSettingsService.shapeStyle.opacity = value.opacity;
          }
          if (value.shadowColor) {
            this.#workshopSettingsService.shapeStyle.shadowColor =
              value.shadowColor;
          }
          if (value.shadowBlur !== null && value.shadowBlur !== undefined) {
            this.#workshopSettingsService.shapeStyle.shadowBlur =
              value.shadowBlur;
          }
          if (
            value.shadowOffsetX !== null &&
            value.shadowOffsetX !== undefined
          ) {
            this.#workshopSettingsService.shapeStyle.shadowOffsetX =
              value.shadowOffsetX;
          }
          if (
            value.shadowOffsetY !== null &&
            value.shadowOffsetY !== undefined
          ) {
            this.#workshopSettingsService.shapeStyle.shadowOffsetY =
              value.shadowOffsetY;
          }
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  clearCanvas() {
    this.#workshopCanvasManagerService.clearCanvas();
  }
}
