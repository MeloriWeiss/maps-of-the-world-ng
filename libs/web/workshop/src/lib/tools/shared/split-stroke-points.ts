import { mapCellOf } from '@wm/shared/workshop';
import { Point } from '../../interfaces';

// Adjacent parts share their endpoint so a long gesture still renders as one line.
/** Разбивает траекторию мазка на части по границам ячеек и ограничению размера. */
export function splitStrokePoints(points: Point[], maxPoints = 256): Point[][] {
  if (points.length <= 1) return points.length ? [points] : [];
  const parts: Point[][] = [];
  let current: Point[] = [points[0]];
  let cellX = mapCellOf(points[0].x),
    cellY = mapCellOf(points[0].y);
  for (let index = 1; index < points.length; index++) {
    const point = points[index];
    const nextX = mapCellOf(point.x),
      nextY = mapCellOf(point.y);
    current.push(point);
    if (current.length >= maxPoints || nextX !== cellX || nextY !== cellY) {
      parts.push(current);
      current = [point];
      cellX = nextX;
      cellY = nextY;
    }
  }
  if (current.length > 1) parts.push(current);
  return parts;
}
