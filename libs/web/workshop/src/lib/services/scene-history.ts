import type {
  SerializedNode,
  SerializedShape,
  WorkshopSnapshot,
} from '../interfaces/workshop-scene-graph-storage';
import type { Bounds } from '../interfaces';

interface FlatNode {
  node: SerializedNode;
  parent: string | null;
  index: number;
}
interface Change<T> {
  id: string;
  before: T | null;
  after: T | null;
}
interface ShapeChange extends Change<SerializedShape> {
  beforeBounds: Bounds | null;
  afterBounds: Bounds | null;
}

/** Набор изменений, сформированный одним действием пользователя. */
export interface SceneMutation {
  shapes: ShapeChange[];
  nodes: Change<FlatNode>[];
}

/** Преобразует дерево узлов в индекс с родителями и порядком элементов. */
function flatten(root: SerializedNode) {
  const result = new Map<string, FlatNode>();

  /** Рекурсивно сохраняет узлы вместе с родителем и исходным порядком. */
  const walk = (node: SerializedNode, parent: string | null, index: number) => {
    result.set(node.id, { node: { ...node, children: [] }, parent, index });
    node.children.forEach((child, i) => walk(child, node.id, i));
  };

  walk(root, null, 0);
  return result;
}

/** Оставляет только записи, изменённые одним действием пользователя. */
export function createSceneMutation(
  fromRaw: string,
  toRaw: string,
  fromBounds: ReadonlyMap<string, Bounds> = new Map(),
  toBounds: ReadonlyMap<string, Bounds> = new Map(),
): SceneMutation {
  const from = JSON.parse(fromRaw) as WorkshopSnapshot;
  const to = JSON.parse(toRaw) as WorkshopSnapshot;

  const fromShapes = new Map(from.shapes.map((shape) => [shape.id, shape]));
  const toShapes = new Map(to.shapes.map((shape) => [shape.id, shape]));
  const before = flatten(from.nodes),
    after = flatten(to.nodes);

  const nodes: SceneMutation['nodes'] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    if (JSON.stringify(before.get(id)) === JSON.stringify(after.get(id)))
      continue;
    nodes.push({
      id,
      before: before.get(id) ?? null,
      after: after.get(id) ?? null,
    });
  }

  const changedShapeIds = new Set<string>();
  for (const id of new Set([...fromShapes.keys(), ...toShapes.keys()])) {
    if (JSON.stringify(fromShapes.get(id)) !== JSON.stringify(toShapes.get(id)))
      changedShapeIds.add(id);
  }
  for (const change of nodes) {
    for (const record of [change.before, change.after]) {
      if (record?.node.type === 'shape')
        changedShapeIds.add(record.node.shapeId);
    }
  }

  const shapes: ShapeChange[] = [...changedShapeIds].map((id) => ({
    id,
    before: fromShapes.get(id) ?? null,
    after: toShapes.get(id) ?? null,
    beforeBounds: fromBounds.get(id) ?? null,
    afterBounds: toBounds.get(id) ?? null,
  }));

  const changedNodeIds = new Set(nodes.map((change) => change.id));
  const beforeShapeNodes = new Map<string, FlatNode>();
  const afterShapeNodes = new Map<string, FlatNode>();
  for (const record of before.values())
    if (record.node.type === 'shape')
      beforeShapeNodes.set(record.node.shapeId, record);
  for (const record of after.values())
    if (record.node.type === 'shape')
      afterShapeNodes.set(record.node.shapeId, record);
  for (const change of shapes) {
    const old = beforeShapeNodes.get(change.id);
    const current = afterShapeNodes.get(change.id);
    const id = current?.node.id ?? old?.node.id;
    if (!id || changedNodeIds.has(id)) continue;
    nodes.push({ id, before: old ?? null, after: current ?? null });
    changedNodeIds.add(id);
  }

  return { shapes, nodes };
}

/**
 * Применяет одно действие к сцене и сохраняет более поздние импорты чанков.
 *
 * Обновляются только узлы и фигуры, включённые в зафиксированную мутацию.
 */
export function applySceneMutation(
  currentRaw: string,
  mutation: SceneMutation,
  direction: 'undo' | 'redo',
) {
  const current = JSON.parse(currentRaw) as WorkshopSnapshot;

  const shapes = new Map(current.shapes.map((shape) => [shape.id, shape]));
  for (const change of mutation.shapes) {
    const shape = change[direction === 'undo' ? 'before' : 'after'];
    if (shape) shapes.set(change.id, shape);
    else shapes.delete(change.id);
  }

  const nodes = flatten(current.nodes);
  for (const change of mutation.nodes) {
    const node = change[direction === 'undo' ? 'before' : 'after'];
    if (node) nodes.set(change.id, node);
    else nodes.delete(change.id);
  }

  const children = new Map<string, FlatNode[]>();
  for (const record of nodes.values()) {
    if (record.parent === null) continue;
    const siblings = children.get(record.parent) ?? [];
    siblings.push(record);
    children.set(record.parent, siblings);
  }

  const build = (id: string): SerializedNode => {
    const record = nodes.get(id);
    if (!record) throw new Error('Missing history node');
    return {
      ...record.node,
      children: (children.get(id) ?? [])
        .sort((a, b) => a.index - b.index)
        .map((child) => build(child.node.id)),
    };
  };

  return JSON.stringify({
    version: 2,
    shapes: [...shapes.values()],
    nodes: build(current.nodes.id),
  });
}

/** Сохраняет совместимость со сборщиками снимков, пока история редактора хранит только компактные изменения. */
export function applySceneHistory(
  currentRaw: string,
  fromRaw: string,
  toRaw: string,
) {
  return applySceneMutation(
    currentRaw,
    createSceneMutation(fromRaw, toRaw),
    'redo',
  );
}
