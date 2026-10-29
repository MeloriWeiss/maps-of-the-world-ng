import { SceneDependencyStore } from '../services/scene-dependency.store';
import { workshopImages } from './image-cache';
import { ShapeImageRef, ShapeImageSource } from './shape-render-context';

interface Entry {
  url: string;
  bytes: number;
  pins: number;
}

/** Локальный набор изображений, ограниченный одним проверенным пакетом зависимостей. */
export class SceneDependencyImages implements ShapeImageSource {
  readonly #dependencies: SceneDependencyStore;
  readonly #documentKey: string;
  readonly #localCommitId: string;
  readonly #entries = new Map<string, Entry>();
  readonly #loading = new Map<string, Promise<Entry>>();
  #disposed = false;

  constructor(
    dependencies: SceneDependencyStore,
    documentKey: string,
    localCommitId: string,
  ) {
    this.#dependencies = dependencies;
    this.#documentKey = documentKey;
    this.#localCommitId = localCommitId;
  }

  async acquire(ref: ShapeImageRef): Promise<() => void> {
    const id = this.#id(ref);
    if (this.#disposed) throw new Error('Ресурсы сохранения уже освобождены');
    const entry = await this.#entry(id);
    entry.pins++;
    let releaseCache: (() => void) | null = null;
    try {
      releaseCache = await workshopImages.acquire(entry.url);
      if (!workshopImages.source(entry.url, Infinity))
        throw new Error('Текстура карты повреждена');
    } catch (error) {
      releaseCache?.();
      entry.pins--;
      this.#trim();
      throw error;
    }
    const release = releaseCache;
    if (!release) throw new Error('Текстура карты недоступна');
    let released = false;
    return () => {
      if (released) return;
      released = true;
      release();
      entry.pins--;
      this.#trim();
    };
  }

  source(ref: ShapeImageRef, screenWidth: number): CanvasImageSource | null {
    const id = this.#id(ref);
    const entry = this.#entries.get(id);
    if (!entry?.pins) return null;
    return workshopImages.source(entry.url, screenWidth);
  }

  dispose() {
    if ([...this.#entries.values()].some((entry) => entry.pins > 0)) {
      throw new Error('Текстура карты ещё используется');
    }
    this.#disposed = true;
    for (const entry of this.#entries.values()) this.#release(entry);
    this.#entries.clear();
  }

  #id(ref: ShapeImageRef): string {
    const id = ref.textureId;
    if (!id || ref.url !== `/api/textures/${encodeURIComponent(id)}/file`) {
      throw new Error('Неверная ссылка текстуры карты');
    }
    return id;
  }

  async #entry(id: string): Promise<Entry> {
    const cached = this.#entries.get(id);
    if (cached) {
      this.#entries.delete(id);
      this.#entries.set(id, cached);
      return cached;
    }
    const pending = this.#loading.get(id);
    if (pending) return pending;
    const load = this.#load(id);
    this.#loading.set(id, load);
    try {
      return await load;
    } finally {
      this.#loading.delete(id);
    }
  }

  async #load(id: string): Promise<Entry> {
    const pieces: Blob[] = [];
    let after = -1,
      bytes = 0;
    while (true) {
      const page = await this.#dependencies.listResource(
        this.#documentKey,
        this.#localCommitId,
        'texture',
        id,
        after,
        1,
      );
      if (!page.length) break;
      const part = page[0];
      if (!part.blob || part.segment !== after + 1)
        throw new Error('Неполная текстура карты');
      pieces.push(part.blob);
      bytes += part.byteLength;
      if (bytes > 16 * 1024 * 1024)
        throw new Error('Текстура карты превышает лимит');
      after = part.segment;
    }
    if (!pieces.length)
      throw new Error('Нет текстуры в зависимостях сохранения');
    if (this.#disposed) throw new Error('Ресурсы сохранения уже освобождены');
    const entry: Entry = {
      url: URL.createObjectURL(new Blob(pieces)),
      bytes,
      pins: 0,
    };
    this.#entries.set(id, entry);
    this.#trim(id);
    return entry;
  }

  #trim(current = '') {
    let bytes = 0;
    for (const entry of this.#entries.values()) bytes += entry.bytes;
    for (const [id, entry] of this.#entries) {
      if (this.#entries.size <= 16 && bytes <= 32 * 1024 * 1024) break;
      if (id === current || entry.pins) continue;
      this.#entries.delete(id);
      bytes -= entry.bytes;
      this.#release(entry);
    }
  }

  #release(entry: Entry) {
    workshopImages.forget(entry.url);
    URL.revokeObjectURL(entry.url);
  }
}
