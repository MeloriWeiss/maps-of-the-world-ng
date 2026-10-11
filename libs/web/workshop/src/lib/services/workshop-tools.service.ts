import {
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
  signal,
} from '@angular/core';
import {
  EraserTool,
  PencilTool,
  RectangleTool,
  SelectTool,
  TextTool,
  TextureTool,
  Tool,
} from '../tools';
import { StampTool } from '../tools/stamp/stamp';
import { WorkshopTools } from '../consts';
import { WorkshopSettingsService } from './workshop-settings.service';

@Injectable()
export class WorkshopToolsService {
  #injector = inject(Injector);
  #settingsService = inject(WorkshopSettingsService);

  #toolsFactories: Record<WorkshopTools, () => Tool> = {
    [WorkshopTools.STAMP]: () => new StampTool(),
    [WorkshopTools.PENCIL]: () => new PencilTool(),
    [WorkshopTools.SELECT]: () => new SelectTool(),
    [WorkshopTools.ERASER]: () => new EraserTool(),
    [WorkshopTools.RECTANGLE]: () => new RectangleTool(),
    [WorkshopTools.TEXT]: () => new TextTool(),
    [WorkshopTools.TEXTURE]: () => new TextureTool(),
  };

  currentTool: Tool = this.#toolsFactories[WorkshopTools.SELECT]();
  currentToolName = signal(WorkshopTools.SELECT);

  setCurrentTool(newTool: WorkshopTools) {
    this.currentTool.dispose?.();
    this.#settingsService.applyToolStyle(newTool);

    runInInjectionContext(this.#injector, () => {
      this.currentTool = this.#toolsFactories[newTool]();
    });
    this.currentToolName.set(newTool);
  }
}
