import { mapCellOf } from '@wm/shared/workshop';
import { ShapesTypes } from '../consts';
import type { Bounds } from '../interfaces';
import type {
  SerializedChunkShape,
  SerializedNode,
  SerializedShape,
} from './workshop-scene-graph-storage.service';
import type { SceneMutation } from './scene-history';
import type { NewSceneMutation } from './scene-draft.repository';

type FlatRecord = {
  node: SerializedNode;
  parent: string | null;
  index: number;
};

function normalizedShape(shape: SerializedShape): SerializedShape {
  return { ...shape, selected: false };
}

function normalizedNode(node: Extract<SerializedNode, { type: 'shape' }>) {
  return { ...node, isDirty: false, children: [] };
}

function area(bounds: Bounds): readonly [number, number, number, number] {
  return [
    bounds.x,
    bounds.y,
    bounds.x + Math.max(1, bounds.width),
    bounds.y + Math.max(1, bounds.height),
  ];
}

function cell(bounds: Bounds): string {
  return `${mapCellOf(bounds.x)}:${mapCellOf(bounds.y)}`;
}

function partBody(
  shape: SerializedShape,
  record: FlatRecord,
  bounds: Bounds,
): string {
  if (record.node.type !== 'shape' || record.parent === null)
    throw new Error('Invalid shape node in completed operation');
  const part: SerializedChunkShape = {
    shape: normalizedShape(shape),
    node: normalizedNode(record.node),
    parentId: record.parent,
    index: record.index,
    bounds: {
      ...bounds,
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height),
    },
  };
  return JSON.stringify(part);
}

function changedInstanceId(
  before: SerializedShape | null,
  after: SerializedShape | null,
): string | undefined {
  const previous = before?.type === ShapesTypes.STAMP ? before.instances : [];
  const current = after?.type === ShapesTypes.STAMP ? after.instances : [];
  if (!previous.length && !current.length) return undefined;
  const oldById = new Map(
    previous.filter((item) => item.id).map((item) => [item.id, item]),
  );
  const newById = new Map(
    current.filter((item) => item.id).map((item) => [item.id, item]),
  );
  const changed = [...new Set([...oldById.keys(), ...newById.keys()])].filter(
    (id) => JSON.stringify(oldById.get(id)) !== JSON.stringify(newById.get(id)),
  );
  return changed.length === 1 ? changed[0] : undefined;
}

function containerBody(record: FlatRecord): string {
  const node = record.node;
  if (node.type === 'shape')
    throw new Error('Invalid container in completed operation');
  const layerData = node.type === 'layer' ? node.layerData : null;
  const name =
    layerData &&
    typeof layerData === 'object' &&
    'name' in layerData &&
    typeof layerData.name === 'string'
      ? layerData.name
      : 'Группа';
  return JSON.stringify({
    id: node.id,
    parentId: record.parent,
    kind: node.type,
    name,
    visible: node.visible,
    locked: node.locked ?? false,
    orderKey: node.zIndex,
    index: record.index,
  });
}

/** Copy postimages while the completed gesture still owns the current graph state. */
export function captureSceneOperation(
  mutation: SceneMutation,
  direction: 'undo' | 'redo',
): NewSceneMutation[] {
  const oldSide = direction === 'redo' ? 'before' : 'after';
  const newSide = direction === 'redo' ? 'after' : 'before';
  const shapeNodes = new Map<
    string,
    { before: FlatRecord | null; after: FlatRecord | null }
  >();
  const result: NewSceneMutation[] = [];
  for (const change of mutation.nodes) {
    const old = change[oldSide];
    const current = change[newSide];
    if (old?.node.type === 'shape')
      shapeNodes.set(old.node.shapeId, { before: old, after: current });
    if (current?.node.type === 'shape')
      shapeNodes.set(current.node.shapeId, { before: old, after: current });
    if (old?.node.type === 'shape' || current?.node.type === 'shape') continue;
    const oldBody = old ? containerBody(old) : null;
    const body = current ? containerBody(current) : null;
    if (oldBody === body) continue;
    result.push({
      entityType: 'container',
      entityId: change.id,
      deleted: body === null,
      ...(body !== null ? { body } : {}),
    });
  }
  for (const change of mutation.shapes) {
    const oldShape = change[oldSide];
    const shape = change[newSide];
    const oldBounds =
      change[oldSide === 'before' ? 'beforeBounds' : 'afterBounds'];
    const newBounds =
      change[newSide === 'before' ? 'beforeBounds' : 'afterBounds'];
    const nodes = shapeNodes.get(change.id);
    const oldNode = nodes?.[oldSide];
    const node = nodes?.[newSide];
    if (
      (oldShape && (!oldBounds || !oldNode)) ||
      (shape && (!newBounds || !node))
    ) {
      throw new Error('Incomplete shape record in completed operation');
    }
    const oldBody =
      oldShape && oldNode && oldBounds
        ? partBody(oldShape, oldNode, oldBounds)
        : null;
    const body =
      shape && node && newBounds ? partBody(shape, node, newBounds) : null;
    if (oldBody === body) continue;
    const objectId = shape?.objectId ?? oldShape?.objectId ?? change.id;
    const instanceId = changedInstanceId(oldShape, shape);
    result.push({
      entityType: 'part',
      entityId: change.id,
      objectId,
      ...(instanceId ? { instanceId } : {}),
      ...(oldBounds
        ? { oldCell: cell(oldBounds), oldBounds: area(oldBounds) }
        : {}),
      ...(newBounds
        ? { newCell: cell(newBounds), newBounds: area(newBounds) }
        : {}),
      deleted: body === null,
      ...(body !== null ? { body } : {}),
    });
  }
  return result;
}
