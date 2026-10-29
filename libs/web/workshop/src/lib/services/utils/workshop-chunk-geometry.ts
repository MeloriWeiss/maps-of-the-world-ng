import type { WorldBounds } from '@wm/shared/workshop';

/** Формирует ключ страницы по ячейке и её идентификатору. */
export function pageKey(page: {
  cellX: number;
  cellY: number;
  pageId: number;
}) {
  return `${page.cellX}:${page.cellY}:${page.pageId}`;
}

/** Формирует ключ ячейки карты по координатам. */
export function cellKey(x: number, y: number) {
  return `${x}:${y}`;
}
/** Формирует ключ тайла по уровню и координатам. */
export function tileKey(level: number, x: number, y: number) {
  return `${level}:${x}:${y}`;
}
/** Проверяет, полностью ли внутренняя область помещается во внешнюю. */
export function contains(outer: WorldBounds, inner: WorldBounds) {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

/** Возвращает минимальные границы, содержащие обе переданные области. */
export function unionBounds(a: WorldBounds, b: WorldBounds): WorldBounds {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);

  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}
