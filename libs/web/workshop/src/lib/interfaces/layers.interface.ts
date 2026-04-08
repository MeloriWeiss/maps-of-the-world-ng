interface LayerData {
  id: string;
  name: string;
  visible: boolean;
}

export type Layers = Record<string, LayerData>;

export interface LayersStorage {
  layers: Layers;
  activeLayerId: string | null;
  layersOrder: string[];
}
