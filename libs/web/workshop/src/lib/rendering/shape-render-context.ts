import { workshopImages } from './image-cache';
import { canvasColor, resolveCanvasColor } from './palette';

/** Идентификатор текстуры и адрес изображения, используемые при отрисовке. */
export interface ShapeImageRef {
  textureId: string | null;
  url: string;
}

/** Контракт получения и временного закрепления изображений фигур. */
export interface ShapeImageSource {
  acquire(ref: ShapeImageRef): Promise<() => void>;
  source(ref: ShapeImageRef, screenWidth: number): CanvasImageSource | null;
}

/** Зависимости для отрисовки фигуры, измерения текста и разрешения цветов. */
export interface ShapeRenderContext {
  readonly images: ShapeImageSource;
  color(value: string): string;
  measureText(text: string, font: string): number;
}

let measureContext: CanvasRenderingContext2D | null = null;

function measureText(text: string, font: string): number {
  if (!measureContext)
    measureContext = document.createElement('canvas').getContext('2d');
  if (!measureContext) return 0;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

const editorImages: ShapeImageSource = {
  acquire: (ref) => workshopImages.acquire(ref.url),
  source: (ref, screenWidth) => workshopImages.source(ref.url, screenWidth),
};

/** Контекст отрисовки фигур в редакторе с общей палитрой и кэшем изображений. */
export const editorShapeRenderContext: ShapeRenderContext = {
  images: editorImages,
  color: (value) =>
    value.startsWith('--') ? canvasColor(value) : resolveCanvasColor(value),
  measureText,
};

/** Создаёт контекст сохранения, который читает изображения только из проверенных зависимостей. */
export function createFrozenShapeRenderContext(
  palette: Readonly<Record<string, string>>,
  images: ShapeImageSource,
): ShapeRenderContext {
  return {
    images: {
      acquire: (ref) => images.acquire(ref),
      source: (ref, screenWidth) => {
        const source = images.source(ref, screenWidth);
        if (!source)
          throw new Error(
            `Saved texture is unavailable: ${ref.textureId ?? ref.url}`,
          );
        return source;
      },
    },
    color: (value) => {
      const token =
        /^var\((--[\w-]+)\)$/.exec(value)?.[1] ??
        (value.startsWith('--') ? value : null);
      if (!token) return value;
      const resolved = palette[token];
      if (!resolved) throw new Error(`Missing saved color token: ${token}`);
      return resolved;
    },
    measureText,
  };
}
