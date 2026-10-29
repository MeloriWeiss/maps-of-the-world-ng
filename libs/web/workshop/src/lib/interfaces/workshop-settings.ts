/** Общие параметры внешнего вида фигур в редакторе Workshop. */
export interface WorkshopShapeStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

/** Параметры обводки и заливки, применяемые выбранным инструментом. */
export interface WorkshopToolStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}
