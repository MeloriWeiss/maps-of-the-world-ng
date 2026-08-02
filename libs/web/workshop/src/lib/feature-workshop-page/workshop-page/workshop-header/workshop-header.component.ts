import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import {
  WorkshopCanvasManagerService,
  WorkshopDrawService,
  WorkshopSettingsService,
  WorkshopWorldGeneratorService,
  WorkshopMapPersistenceService,
} from '../../../services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import {
  createTransientMessage,
  SearchableSelectComponent,
  SearchableSelectOption,
  SvgComponent,
  PopoverComponent,
} from '@wm/web/common-ui';

@Component({
  selector: 'wm-workshop-header',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    SearchableSelectComponent,
    SvgComponent,
    PopoverComponent,
  ],
  templateUrl: './workshop-header.component.html',
  styleUrl: './workshop-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopHeaderComponent {
  #workshopDrawService = inject(WorkshopDrawService);
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  #workshopSettingsService = inject(WorkshopSettingsService);
  #worldGenerator = inject(WorkshopWorldGeneratorService);
  persistence = inject(WorkshopMapPersistenceService);

  #generationMessage = createTransientMessage();
  generationStatus = this.#generationMessage.value;
  seed = signal('middle-earth');
  mapOptions = computed<readonly SearchableSelectOption<number>[]>(() =>
    this.persistence.maps().map((map) => ({
      value: map.id,
      label: map.name,
      description: map.isPublished ? 'Опубликована' : 'Черновик',
    })),
  );

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
    this.#workshopCanvasManagerService.clearUserContent();
  }

  generateWorld() {
    const result = this.#worldGenerator.generate(
      this.seed().trim() || undefined,
    );
    this.#generationMessage.show(
      `Seed ${result.seed}: ${result.objects.toLocaleString('ru-RU')} объектов`,
    );
  }

  saveMap() {
    void this.persistence.save();
  }

  saveCopy() {
    void this.persistence.saveCopy();
  }

  loadMap() {
    void this.persistence.load();
  }

  createMap() {
    this.persistence.newMap();
  }

  selectMap(mapId: number | null) {
    void this.persistence.selectMap(mapId);
  }

  updateMapName(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    this.persistence.mapName.set(input.value);
  }

  updateMapDescription(event: Event) {
    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    this.persistence.mapDescription.set(textarea.value);
  }
}
