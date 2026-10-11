import { applySceneHistory } from './scene-history';

const shape = (id: string, x: number) => ({
  id,
  type: 'rectangle',
  x,
  y: 0,
  width: 10,
  height: 10,
  strokeWidth: 1,
  opacity: 1,
});
function snapshot(shapes: ReturnType<typeof shape>[]) {
  return JSON.stringify({
    version: 2,
    shapes,
    nodes: {
      id: 'root',
      type: 'layer',
      children: shapes.map((item) => ({
        id: `node-${item.id}`,
        type: 'shape',
        shapeId: item.id,
        children: [],
      })),
    },
  });
}

describe('History with asynchronous chunk loading', () => {
  it('undoes one edit without discarding a subsequently loaded chunk', () => {
    const before = snapshot([shape('edited', 0)]);
    const after = snapshot([shape('edited', 20)]);
    const current = snapshot([shape('edited', 20), shape('loaded', 1000)]);
    const result = JSON.parse(applySceneHistory(current, after, before));
    expect(result.shapes).toEqual([shape('edited', 0), shape('loaded', 1000)]);
    expect(result.nodes.children).toHaveLength(2);
  });

  it('restores an erased object and preserves other loaded objects', () => {
    const before = snapshot([shape('erased', 0)]);
    const after = snapshot([]);
    const current = snapshot([shape('loaded', 1000)]);
    const result = JSON.parse(applySceneHistory(current, after, before));
    expect(result.shapes.map((item: { id: string }) => item.id).sort()).toEqual(
      ['erased', 'loaded'],
    );
  });
});
