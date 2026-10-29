/** Имя и состояние отображения одного слоя редактора. */
interface LayerData {
  id: string;
  name: string;
  visible: boolean;
}

/** Слои редактора, индексированные по идентификатору. */
export type Layers = Record<string, LayerData>;

/** Слои карты, выбранный слой и порядок их отображения. */
export interface LayersStorage {
  layers: Layers;
  activeLayerId: string | null;
  layersOrder: string[];
}
