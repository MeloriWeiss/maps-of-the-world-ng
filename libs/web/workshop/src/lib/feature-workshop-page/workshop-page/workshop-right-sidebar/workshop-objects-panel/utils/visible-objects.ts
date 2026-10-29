import { intersectsBounds, type WorldBounds } from '@wm/shared/workshop';
import { GraphNode, ShapeNode } from '../../../../../nodes';
import { StampShape } from '../../../../../shapes';
import type { LocalObject } from '../workshop-objects-panel.component.types';

/** Собирает подходящие для текущего масштаба объекты из дерева сцены. */
export function collectVisibleObjects(
  root: GraphNode,
  viewport: WorldBounds,
  zoom: number,
  kind: string,
  search: string,
): LocalObject[] {
  const result: LocalObject[] = [];
  const groups = new Map<string, LocalObject>();
  const query = search.trim().toLocaleLowerCase();

  const visit = (node: GraphNode) => {
    if (!node.visible) return;

    if (node instanceof ShapeNode) {
      const item = toVisibleObject(node, viewport, zoom, kind, query);
      if (!item) return;

      const id = node.shape.objectId ?? node.shape.id;
      const existing = groups.get(id);

      if (existing) {
        existing.parts.push(node);
        existing.count += item.count;
        return;
      }

      groups.set(id, item);
      result.push(item);
      return;
    }

    for (const child of node.children) visit(child);
  };

  visit(root);

  return result;
}

/** Находит экземпляры штампов в пределах выбранной видимой области. */
export function collectVisibleStampInstances(
  item: LocalObject | undefined,
  viewport: WorldBounds,
) {
  if (!item?.stamp) return [];

  return item.parts
    .flatMap((node) => {
      if (!(node.shape instanceof StampShape)) return [];

      const stamp = node.shape;

      return stamp.instances
        .map((instance, index) => ({ id: instance.id, node, instance, index }))
        .filter(({ instance }) =>
          intersectsBounds(stamp.getInstanceBounds(instance), viewport),
        );
    })
    .slice(0, 100);
}

function toVisibleObject(
  node: ShapeNode,
  viewport: WorldBounds,
  zoom: number,
  kind: string,
  query: string,
): LocalObject | null {
  const shape = node.shape;

  if (!intersectsBounds(shape.getBounds(), viewport)) return null;
  if (zoom < (shape.minZoom ?? 0) || zoom > (shape.maxZoom ?? Infinity))
    return null;
  if (kind && shape.type !== kind) return null;

  const name = shape.name || 'Объект';
  if (!name.toLocaleLowerCase().includes(query)) return null;

  const stamp = shape instanceof StampShape ? shape : null;
  const image =
    'textureUrl' in shape && typeof shape.textureUrl === 'string'
      ? shape.textureUrl
      : null;

  return {
    node,
    parts: [node],
    name,
    image,
    stamp,
    count: stamp?.instances.length ?? 0,
  };
}
