import { Injectable } from '@angular/core';
import {
  EraserTool,
  PencilTool,
  RectangleTool,
  SelectTool,
  Tool,
} from '../tools';
import { WorkshopTools } from '../consts';

@Injectable()
export class WorkshopToolsService {
  #instruments: Record<string, Tool> = {
    [WorkshopTools.PENCIL]: new PencilTool(),
    [WorkshopTools.SELECT]: new SelectTool(),
    [WorkshopTools.ERASER]: new EraserTool(),
    [WorkshopTools.RECTANGLE]: new RectangleTool(),
  };

  currentTool = this.#instruments[WorkshopTools.RECTANGLE];

  setCurrentTool(newTool: WorkshopTools) {
    this.currentTool = this.#instruments[newTool];
  }
}
