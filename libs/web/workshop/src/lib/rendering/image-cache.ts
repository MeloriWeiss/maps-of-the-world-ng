interface ImageEntry {
  image: HTMLImageElement;
  ready: Promise<void>;
  levels: Map<number, HTMLCanvasElement>;
  pins: number;
}

/** Общий ограниченный кэш изображений; производные размеры не попадают в снимки карты и хранилище. */
class WorkshopImageCache {
  #entries = new Map<string, ImageEntry>();
  #budget = 96 * 1024 * 1024;

  load(url: string) {
    const existing = this.#entries.get(url);
    if (existing) {
      this.#entries.delete(url);
      this.#entries.set(url, existing);
      return existing;
    }
    const image = new Image();
    const ready = new Promise<void>((resolve) => {
      image.onload = () => {
        this.#trim(url);
        resolve();
      };
      image.onerror = () => resolve();
    });
    const entry: ImageEntry = { image, ready, levels: new Map(), pins: 0 };
    this.#entries.set(url, entry);
    image.src = url;
    return entry;
  }

  async acquire(url: string): Promise<() => void> {
    const entry = this.load(url);
    entry.pins++;
    await entry.ready;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      entry.pins--;
      this.#trim('');
    };
  }

  source(url: string, screenWidth: number): CanvasImageSource | null {
    const entry = this.load(url);
    const image = entry.image;
    if (!image.complete || !image.naturalWidth) return null;
    const level = Math.max(
      0,
      Math.floor(Math.log2(image.naturalWidth / Math.max(16, screenWidth))),
    );
    if (!level) return image;
    const cached = entry.levels.get(level);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(image.naturalWidth / 2 ** level));
    canvas.height = Math.max(1, Math.ceil(image.naturalHeight / 2 ** level));
    const ctx = canvas.getContext('2d');
    if (!ctx) return image;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    entry.levels.set(level, canvas);
    this.#trim(url);
    return canvas;
  }

  forget(url: string) {
    const entry = this.#entries.get(url);
    if (entry?.pins) throw new Error('Изображение карты ещё используется');
    this.#entries.delete(url);
  }

  #trim(current: string) {
    let bytes = 0;
    for (const entry of this.#entries.values()) {
      bytes += entry.image.naturalWidth * entry.image.naturalHeight * 4;
      for (const canvas of entry.levels.values())
        bytes += canvas.width * canvas.height * 4;
    }
    for (const [url, entry] of this.#entries) {
      if (bytes <= this.#budget) break;
      if (url === current || entry.pins > 0) continue;
      bytes -= entry.image.naturalWidth * entry.image.naturalHeight * 4;
      for (const canvas of entry.levels.values())
        bytes -= canvas.width * canvas.height * 4;
      this.#entries.delete(url);
    }
  }
}

/** Общий кэш изображений, используемых при отрисовке Workshop. */
export const workshopImages = new WorkshopImageCache();
