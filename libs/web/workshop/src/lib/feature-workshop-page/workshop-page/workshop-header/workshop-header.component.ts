import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  WorkshopCanvasManagerService,
  WorkshopWorldGeneratorService,
  WorkshopMapPersistenceService,
  WorkshopModeService,
  WorkshopShapesService,
} from '../../../services';
import { RouterLink } from '@angular/router';
import {
  createTransientMessage,
  SearchableSelectComponent,
  SearchableSelectOption,
  SvgComponent,
  PopoverComponent,
} from '@wm/web/common-ui';

/** Заголовок Workshop с действиями карты и сохранения. */
@Component({
  selector: 'wm-workshop-header',
  imports: [
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
  #workshopCanvasManagerService = inject(WorkshopCanvasManagerService);
  readonly history = inject(WorkshopShapesService);
  readonly mode = inject(WorkshopModeService);
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

  clearCanvas() {
    this.#workshopCanvasManagerService.clearUserContent();
  }

  undo() {
    if (this.mode.isReadOnly() || !this.history.canUndo()) return;
    this.history.undo();
    this.#workshopCanvasManagerService.requestRedraw();
  }

  redo() {
    if (this.mode.isReadOnly() || !this.history.canRedo()) return;
    this.history.redo();
    this.#workshopCanvasManagerService.requestRedraw();
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
