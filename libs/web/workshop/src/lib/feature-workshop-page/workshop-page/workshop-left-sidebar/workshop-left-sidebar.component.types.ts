import type { WorkshopTools } from '../../../consts';

/** Данные кнопки выбора инструмента на боковой панели. */
export interface ToolButton {
  name: WorkshopTools;
  icon: string;
  label: string;
  configurable: boolean;
  secondary?: boolean;
}

/** Положение и состояние контекстного меню редактора. */
export interface ContextMenuState {
  tool: WorkshopTools;
  label: string;
  x: number;
  y: number;
}
