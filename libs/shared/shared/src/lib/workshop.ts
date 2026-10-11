export const textureKinds = ['SURFACE', 'STAMP'] as const;
export type TextureKind = (typeof textureKinds)[number];

export interface WorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const mapChunkSize = 2048;
export const mapWorldHalfSize = 2 ** 30;
export const mapPreviewMaxLevel = 20;
export const mapPreviewPixels = 256;

export interface MapScenePageDescriptor {
  cellX: number;
  cellY: number;
  pageId: number;
  bounds: WorldBounds;
}

export interface MapPreviewDescriptor {
  level: number;
  x: number;
  y: number;
  version: number;
}

export interface MapSceneHeaderV4 {
  version: 4;
  previewContentVersion?: number;
  previewContentRevision?: number;
  bounds: WorldBounds;
  rootId: string;
  bootstrap: MapPreviewDescriptor[];
  documentPalette: string;
}

export function createEmptyMapSceneHeader(): MapSceneHeaderV4 {
  return {
    version: 4,
    bounds: { x: 0, y: 0, width: 1024, height: 1024 },
    rootId: 'map-root',
    bootstrap: [],
    documentPalette: 'default',
  };
}

export function mapCellOf(value: number): number {
  return Math.floor(value / mapChunkSize);
}

export function mapPreviewParent(level: number, x: number, y: number) {
  return { level: level + 1, x: Math.floor(x / 2), y: Math.floor(y / 2) };
}

export function mapPreviewBounds(
  level: number,
  x: number,
  y: number,
): WorldBounds {
  const size = mapChunkSize * 2 ** level;
  return { x: x * size, y: y * size, width: size, height: size };
}

export function isMapSceneHeaderV4(value: unknown): value is MapSceneHeaderV4 {
  return (
    isRecord(value) &&
    value['version'] === 4 &&
    isWorldBounds(value['bounds']) &&
    (value['previewContentVersion'] === undefined ||
      value['previewContentVersion'] === 1 ||
      value['previewContentVersion'] === 2 ||
      value['previewContentVersion'] === 3) &&
    (value['previewContentRevision'] === undefined ||
      (isFiniteNumber(value['previewContentRevision']) &&
        Number.isInteger(value['previewContentRevision']) &&
        value['previewContentRevision'] >= 0)) &&
    typeof value['rootId'] === 'string' &&
    typeof value['documentPalette'] === 'string' &&
    Array.isArray(value['bootstrap']) &&
    value['bootstrap'].length <= 16 &&
    value['bootstrap'].every(
      (item) =>
        isRecord(item) &&
        isFiniteNumber(item['level']) &&
        Number.isInteger(item['level']) &&
        item['level'] >= 0 &&
        item['level'] <= mapPreviewMaxLevel &&
        Number.isInteger(item['x']) &&
        Number.isInteger(item['y']) &&
        isFiniteNumber(item['version']) &&
        Number.isInteger(item['version']) &&
        item['version'] >= 0,
    )
  );
}

export interface MapChunkDescriptor {
  key: string;
  bounds: WorldBounds;
}

export interface MapChunkPayload extends MapChunkDescriptor {
  body: string;
}

export interface MapSceneManifest {
  version: 3;
  nodes: unknown;
  chunks: MapChunkDescriptor[];
  bounds: WorldBounds;
  overviewBounds?: WorldBounds;
}

export function createEmptyMapSceneManifest(): MapSceneManifest {
  return {
    version: 3,
    nodes: {
      id: 'map-root',
      type: 'layer',
      visible: true,
      locked: false,
      isDirty: true,
      zIndex: 0,
      layerData: { name: 'Карта' },
      children: [],
    },
    chunks: [],
    bounds: { x: 0, y: 0, width: 1024, height: 1024 },
  };
}

export interface MapChunkShapeRecord {
  shape: Record<string, unknown>;
  node: Record<string, unknown>;
  parentId: string;
  index: number;
  bounds?: WorldBounds;
}

export function isMapSceneManifest(value: unknown): value is MapSceneManifest {
  if (
    !isRecord(value) ||
    value['version'] !== 3 ||
    !isWorldBounds(value['bounds']) ||
    (value['overviewBounds'] !== undefined &&
      !isWorldBounds(value['overviewBounds'])) ||
    !Array.isArray(value['chunks']) ||
    value['chunks'].length > 100_000
  )
    return false;
  let nodeCount = 0;
  const isContainer = (node: unknown): boolean => {
    if (
      !isRecord(node) ||
      !['layer', 'group'].includes(String(node['type'])) ||
      typeof node['id'] !== 'string' ||
      typeof node['visible'] !== 'boolean' ||
      typeof node['isDirty'] !== 'boolean' ||
      !isFiniteNumber(node['zIndex']) ||
      !Array.isArray(node['children'])
    )
      return false;
    if (node['locked'] !== undefined && typeof node['locked'] !== 'boolean')
      return false;
    if (node['type'] === 'layer' && !('layerData' in node)) return false;
    nodeCount += 1;
    if (nodeCount > 100_000) return false;
    return node['children'].every(isContainer);
  };
  if (!isContainer(value['nodes'])) return false;
  const keys = new Set<string>();
  return value['chunks'].every((chunk) => {
    if (
      !isRecord(chunk) ||
      typeof chunk['key'] !== 'string' ||
      !/^-?\d+:-?\d+$/.test(chunk['key']) ||
      !isWorldBounds(chunk['bounds']) ||
      keys.has(chunk['key'])
    )
      return false;
    keys.add(chunk['key']);
    return true;
  });
}

export function isMapChunkBody(value: unknown): value is MapChunkShapeRecord[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (
      !isRecord(item) ||
      !isRecord(item['shape']) ||
      !isRecord(item['node']) ||
      typeof item['parentId'] !== 'string' ||
      !isFiniteNumber(item['index']) ||
      !Number.isInteger(item['index']) ||
      item['index'] < 0 ||
      (item['bounds'] !== undefined && !isWorldBounds(item['bounds']))
    )
      return false;
    const shape = item['shape'];
    const node = item['node'];
    if (
      typeof shape['id'] !== 'string' ||
      typeof node['id'] !== 'string' ||
      node['type'] !== 'shape' ||
      node['shapeId'] !== shape['id'] ||
      typeof node['visible'] !== 'boolean' ||
      typeof node['isDirty'] !== 'boolean' ||
      !isFiniteNumber(node['zIndex']) ||
      !Array.isArray(node['children']) ||
      node['children'].length !== 0 ||
      (node['locked'] !== undefined && typeof node['locked'] !== 'boolean') ||
      !['text', 'stamp', 'line', 'rectangle', 'texture'].includes(
        String(shape['type']),
      ) ||
      typeof shape['strokeColor'] !== 'string' ||
      !isFiniteNumber(shape['opacity']) ||
      shape['opacity'] < 0 ||
      shape['opacity'] > 1 ||
      !isFiniteNumber(shape['strokeWidth']) ||
      shape['strokeWidth'] < 0
    )
      return false;
    if (
      shape['erasures'] !== undefined &&
      (!Array.isArray(shape['erasures']) ||
        !shape['erasures'].every(
          (hole) =>
            isRecord(hole) &&
            isFiniteNumber(hole['x']) &&
            isFiniteNumber(hole['y']) &&
            isFiniteNumber(hole['radius']) &&
            hole['radius'] > 0,
        ))
    )
      return false;
    switch (shape['type']) {
      case 'text':
        return (
          typeof shape['text'] === 'string' &&
          isFiniteNumber(shape['x']) &&
          isFiniteNumber(shape['y']) &&
          isFiniteNumber(shape['fontSize']) &&
          typeof shape['fontFamily'] === 'string' &&
          typeof shape['fillColor'] === 'string'
        );
      case 'stamp':
        return (
          typeof shape['textureId'] === 'string' &&
          typeof shape['textureUrl'] === 'string' &&
          Array.isArray(shape['instances']) &&
          shape['instances'].every(
            (stamp) =>
              isRecord(stamp) &&
              isFiniteNumber(stamp['x']) &&
              isFiniteNumber(stamp['y']) &&
              isFiniteNumber(stamp['width']) &&
              stamp['width'] > 0 &&
              isFiniteNumber(stamp['height']) &&
              stamp['height'] > 0 &&
              isFiniteNumber(stamp['rotation']),
          )
        );
      case 'line':
        return isPointArray(shape['points']);
      case 'rectangle':
        return (
          isFiniteNumber(shape['x']) &&
          isFiniteNumber(shape['y']) &&
          isFiniteNumber(shape['width']) &&
          isFiniteNumber(shape['height']) &&
          typeof shape['fillColor'] === 'string'
        );
      case 'texture':
        return (
          isPointArray(shape['points']) &&
          (shape['textureId'] === null ||
            typeof shape['textureId'] === 'string') &&
          (shape['textureUrl'] === null ||
            typeof shape['textureUrl'] === 'string') &&
          isFiniteNumber(shape['textureScale']) &&
          isFiniteNumber(shape['textureRotation']) &&
          typeof shape['textureColor'] === 'string'
        );
      default:
        return false;
    }
  });
}

function isPointArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (point) =>
        isRecord(point) &&
        isFiniteNumber(point['x']) &&
        isFiniteNumber(point['y']),
    )
  );
}

function isWorldBounds(value: unknown): value is WorldBounds {
  return (
    isRecord(value) &&
    isFiniteNumber(value['x']) &&
    isFiniteNumber(value['y']) &&
    isFiniteNumber(value['width']) &&
    value['width'] > 0 &&
    isFiniteNumber(value['height']) &&
    value['height'] > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function intersectsBounds(a: WorldBounds, b: WorldBounds) {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}
