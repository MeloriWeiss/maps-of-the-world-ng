import { RectangleCreateData } from '../shapes/rectangle/rectangle.interface';
import { LineCreateData } from '../shapes/line/line.interface';

/** Данные создания фигур, доступных инструментам рисования. */
export type ShapesData = RectangleCreateData | LineCreateData;
