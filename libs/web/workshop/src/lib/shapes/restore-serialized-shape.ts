import { ShapesTypes } from '../consts';
import type { SerializedShape } from '../interfaces/workshop-scene-graph-storage';
import { LineShape } from './line';
import { RectangleShape } from './rectangle';
import { Shape } from './shape';
import { StampShape } from './stamp/stamp';
import { TextShape } from './text';
import { TextureStrokeShape } from './texture-stroke';

/** Восстанавливает фигуру тем же классом, который используют редактор и сборщик сохранения. */
export function restoreSerializedShape(
  record: SerializedShape,
  selected = record.selected ?? false,
): Shape {
  let shape: Shape;
  switch (record.type) {
    case ShapesTypes.TEXT:
      shape = new TextShape(record);
      break;
    case ShapesTypes.STAMP:
      shape = new StampShape(record);
      break;
    case ShapesTypes.LINE:
      shape = new LineShape({
        ...record,
        points: record.points.map((point) => ({ ...point })),
      });
      break;
    case ShapesTypes.RECTANGLE:
      shape = new RectangleShape(record);
      break;
    case ShapesTypes.TEXTURE:
      shape = new TextureStrokeShape({
        ...record,
        points: record.points.map((point) => ({ ...point })),
      });
      break;
    default:
      throw new Error('Unsupported saved shape type');
  }

  Object.defineProperty(shape, 'id', {
    value: record.id,
    writable: false,
    configurable: true,
  });
  shape.objectId = record.objectId;
  shape.erasures = record.erasures?.map((hole) => ({ ...hole })) ?? [];
  shape.selected = selected;
  shape.name = record.name;
  shape.layerId = record.layerId;
  shape.shadowColor = record.shadowColor;
  shape.shadowBlur = record.shadowBlur;
  shape.shadowOffsetX = record.shadowOffsetX;
  shape.shadowOffsetY = record.shadowOffsetY;
  shape.minZoom = record.minZoom ?? 0;
  shape.maxZoom = record.maxZoom ?? Number.POSITIVE_INFINITY;
  shape.mapObjectType = record.mapObjectType;
  return shape;
}
