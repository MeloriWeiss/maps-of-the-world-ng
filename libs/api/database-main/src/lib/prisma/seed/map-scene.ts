/** Создаёт тестовые данные карты без побочных эффектов; существующие данные удаляет сам seed-сценарий. */
export function seedMapScene(index: number) {
  const rootId = `seed-map-${index}-root`;
  const shapeId = `seed-map-${index}-title`;
  const bounds = { x: 100, y: 100, width: 700, height: 80 };
  const shape = {
    id: shapeId,
    type: 'text',
    name: 'Название карты',
    text: `Демонстрационная карта ${index + 1}`,
    x: 100,
    y: 160,
    fontSize: 28,
    fontFamily: 'serif',
    fillColor: 'var(--text-primary-color)',
    strokeColor: 'var(--text-primary-color)',
    opacity: 1,
    strokeWidth: 0,
  };
  const node = {
    id: `seed-map-${index}-node`,
    type: 'shape',
    visible: true,
    locked: false,
    isDirty: false,
    zIndex: 0,
    children: [],
    shapeId,
  };
  const edges = {
    minX: bounds.x,
    minY: bounds.y,
    maxX: bounds.x + bounds.width,
    maxY: bounds.y + bounds.height,
  };
  return {
    body: JSON.stringify({
      version: 4,
      rootId,
      bounds,
      bootstrap: [],
      documentPalette: 'default',
    }),
    container: {
      id: rootId,
      parentId: null,
      kind: 'layer',
      name: 'Карта',
      orderKey: 0,
    },
    object: {
      objectId: shapeId,
      nodeId: node.id,
      parentId: rootId,
      kind: 'text',
      name: shape.name,
      ...edges,
      partCount: 1,
    },
    part: {
      objectId: shapeId,
      partId: shapeId,
      cellX: 0,
      cellY: 0,
      pageId: 0,
      ...edges,
    },
    page: {
      cellX: 0,
      cellY: 0,
      pageId: 0,
      ...edges,
      body: JSON.stringify([{ shape, node, parentId: rootId, index: 0 }]),
    },
  };
}
