const encoder = new TextEncoder();
const MAGIC = encoder.encode('WMSAVE1\n');
const CHAIN_SEED = encoder.encode('wm-scene-bundle-v1');
const MAX_METADATA_BYTES = 4096;

/** Типы частей, которые могут передаваться в пакете сцены. */
export type SceneBundleKind =
  | 'page'
  | 'tile'
  | 'container'
  | 'empty'
  | 'texture'
  | 'intent'
  | 'preview-plan';

/** Метаданные бинарного кадра с содержимым одной части коммита. */
export interface SceneBundleDataMetadata {
  type: 'data';
  kind: SceneBundleKind;
  ordinal: number;
  partKey: string;
  digest: string;
  byteLength: number;
  targetKind?: 'page' | 'tile' | 'container';
  cellX?: number;
  cellY?: number;
  pageId?: number;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  level?: number;
  x?: number;
  y?: number;
  segment?: number;
  entityType?: 'part' | 'container';
  entityId?: string;
  objectId?: string;
  instanceId?: string;
  oldCell?: string;
  newCell?: string;
  oldBounds?: readonly [number, number, number, number];
  newBounds?: readonly [number, number, number, number];
  deleted?: boolean;
}

/** Итоговая запись пакета с контрольными суммами и числом кадров. */
export interface SceneBundleTerminalMetadata {
  type: 'terminal';
  count: number;
  payloadBytes: number;
  hash: string;
}

/** Преобразует последовательность байтов в нижний шестнадцатеричный формат. */
function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/** Кодирует беззнаковое 32-битное число в сетевом порядке байтов. */
function uint32(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff)
    throw new RangeError('Invalid frame length');
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

/** Вычисляет SHA-256 для переданного бинарного блока. */
async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

/** Собирает заголовок и содержимое в бинарный кадр протокола. */
function frame(metadata: object, payload: Uint8Array): Uint8Array {
  const header = encoder.encode(JSON.stringify(metadata));
  if (header.byteLength > MAX_METADATA_BYTES)
    throw new RangeError('Frame metadata exceeds 4 KiB');
  const bytes = new Uint8Array(8 + header.byteLength + payload.byteLength);
  bytes.set(uint32(header.byteLength), 0);
  bytes.set(uint32(payload.byteLength), 4);
  bytes.set(header, 8);
  bytes.set(payload, 8 + header.byteLength);
  return bytes;
}

/** Возвращает предельный размер содержимого для типа кадра. */
function payloadLimit(kind: SceneBundleKind): number {
  if (kind === 'tile') return 350_000;
  if (kind === 'preview-plan') return 64 * 1024;
  return 256 * 1024;
}

/** Читает бинарный поток последовательно, не требуя целого буфера в памяти. */
class BundleByteReader {
  readonly #reader: ReadableStreamDefaultReader<Uint8Array>;
  #chunk = new Uint8Array();
  #position = 0;
  #ended = false;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.#reader = stream.getReader();
  }

  /** Читает указанное число байтов, объединяя поступившие чанки потока. */
  async read(length: number): Promise<Uint8Array | null> {
    if (!Number.isSafeInteger(length) || length < 0 || length > 1024 * 1024) {
      throw new RangeError('Invalid bundle read size');
    }
    const result = new Uint8Array(length);
    let copied = 0;
    while (copied < length) {
      if (this.#position === this.#chunk.byteLength) {
        if (this.#ended) {
          if (copied === 0) return null;
          throw new Error('Truncated bundle frame');
        }
        const next = await this.#reader.read();
        this.#ended = next.done;
        this.#chunk = next.value ?? new Uint8Array();
        this.#position = 0;
        continue;
      }
      const take = Math.min(
        length - copied,
        this.#chunk.byteLength - this.#position,
      );
      result.set(
        this.#chunk.subarray(this.#position, this.#position + take),
        copied,
      );
      copied += take;
      this.#position += take;
    }
    return result;
  }

  /** Проверяет, что поток закончился сразу после последнего кадра. */
  async end(): Promise<boolean> {
    return (await this.read(1)) === null;
  }

  /** Отменяет чтение и освобождает блокировку потока. */
  async cancel() {
    await this.#reader.cancel().catch(() => undefined);
    this.#reader.releaseLock();
  }
}

/** Проверяет структуру и допустимые значения метаданных кадра данных. */
function isDataMetadata(value: unknown): value is SceneBundleDataMetadata {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SceneBundleDataMetadata>;
  return (
    item.type === 'data' &&
    (item.kind === 'page' ||
      item.kind === 'tile' ||
      item.kind === 'container' ||
      item.kind === 'empty' ||
      item.kind === 'texture' ||
      item.kind === 'intent' ||
      item.kind === 'preview-plan') &&
    Number.isSafeInteger(item.ordinal) &&
    (item.ordinal ?? -1) >= 0 &&
    typeof item.partKey === 'string' &&
    item.partKey.length > 0 &&
    typeof item.digest === 'string' &&
    /^[0-9a-f]{64}$/.test(item.digest) &&
    Number.isSafeInteger(item.byteLength) &&
    (item.byteLength ?? -1) >= 0 &&
    Object.keys(value).every((key) =>
      [
        'type',
        'kind',
        'ordinal',
        'partKey',
        'digest',
        'byteLength',
        'targetKind',
        'cellX',
        'cellY',
        'pageId',
        'minX',
        'minY',
        'maxX',
        'maxY',
        'level',
        'x',
        'y',
        'segment',
        'entityType',
        'entityId',
        'objectId',
        'instanceId',
        'oldCell',
        'newCell',
        'oldBounds',
        'newBounds',
        'deleted',
      ].includes(key),
    ) &&
    ['cellX', 'cellY', 'pageId', 'level', 'x', 'y', 'segment'].every((key) => {
      const field = (value as Record<string, unknown>)[key];
      return field === undefined || Number.isSafeInteger(field);
    }) &&
    ['minX', 'minY', 'maxX', 'maxY'].every((key) => {
      const field = (value as Record<string, unknown>)[key];
      return (
        field === undefined ||
        (typeof field === 'number' && Number.isFinite(field))
      );
    }) &&
    ['entityId', 'objectId', 'instanceId', 'oldCell', 'newCell'].every(
      (key) => {
        const field = (value as Record<string, unknown>)[key];
        return field === undefined || typeof field === 'string';
      },
    ) &&
    (item.deleted === undefined || typeof item.deleted === 'boolean') &&
    (item.targetKind === undefined ||
      ['page', 'tile', 'container'].includes(item.targetKind)) &&
    (item.entityType === undefined ||
      item.entityType === 'part' ||
      item.entityType === 'container') &&
    ['oldBounds', 'newBounds'].every((key) => {
      const field = (value as Record<string, unknown>)[key];
      return (
        field === undefined ||
        (Array.isArray(field) &&
          field.length === 4 &&
          field.every(
            (number: unknown) =>
              typeof number === 'number' && Number.isFinite(number),
          ))
      );
    })
  );
}

/** Проверяет структуру итогового кадра и его контрольные значения. */
function isTerminal(value: unknown): value is SceneBundleTerminalMetadata {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SceneBundleTerminalMetadata>;
  return (
    item.type === 'terminal' &&
    Number.isSafeInteger(item.count) &&
    Number.isSafeInteger(item.payloadBytes) &&
    typeof item.hash === 'string' &&
    /^[0-9a-f]{64}$/.test(item.hash) &&
    Object.keys(value).every((key) =>
      ['type', 'count', 'payloadBytes', 'hash'].includes(key),
    )
  );
}

/**
 * Кодирует и проверяет поток частей сцены.
 *
 * Кадры связаны цепочкой SHA-256, а завершающий кадр подтверждает число частей,
 * суммарный размер и полный порядок переданных данных.
 */
export class SceneBundleCodec {
  static readonly contentType = 'application/vnd.wm.scene-bundle';
  static readonly magic = MAGIC;

  /** Вычисляет начальную контрольную сумму цепочки кадров. */
  static async initialHash(): Promise<Uint8Array> {
    return sha256(CHAIN_SEED);
  }

  /**
   * Кодирует кадр данных и вычисляет следующую контрольную сумму цепочки.
   *
   * @param input Метаданные части без вычисляемых полей кадра.
   * @param payload Содержимое части.
   * @param previousHash Контрольная сумма предыдущего кадра.
   * @returns Байты кадра, его контрольная сумма и итоговые метаданные.
   */
  static async data(
    input: Omit<SceneBundleDataMetadata, 'type' | 'digest' | 'byteLength'>,
    payload: Uint8Array,
    previousHash: Uint8Array,
  ): Promise<{
    bytes: Uint8Array;
    hash: Uint8Array;
    metadata: SceneBundleDataMetadata;
  }> {
    if (
      !input.partKey ||
      !Number.isSafeInteger(input.ordinal) ||
      input.ordinal < 0 ||
      payload.byteLength > payloadLimit(input.kind) ||
      previousHash.byteLength !== 32
    ) {
      throw new RangeError('Invalid bundle data frame');
    }

    const payloadHash = await sha256(payload);
    const metadata: SceneBundleDataMetadata = {
      type: 'data',
      ...input,
      digest: hex(payloadHash),
      byteLength: payload.byteLength,
    };

    const bytes = frame(metadata, payload);
    const headerLength = new DataView(bytes.buffer).getUint32(0, false);
    const inputHash = new Uint8Array(32 + 4 + headerLength + 4 + 32);
    inputHash.set(previousHash, 0);
    inputHash.set(bytes.subarray(0, 4), 32);
    inputHash.set(bytes.subarray(8, 8 + headerLength), 36);
    inputHash.set(bytes.subarray(4, 8), 36 + headerLength);
    inputHash.set(payloadHash, 40 + headerLength);

    return { bytes, hash: await sha256(inputHash), metadata };
  }

  /** Формирует завершающий кадр с числом частей, размером данных и хешем. */
  static terminal(
    count: number,
    payloadBytes: number,
    hash: Uint8Array,
  ): Uint8Array {
    if (
      !Number.isSafeInteger(count) ||
      count < 0 ||
      !Number.isSafeInteger(payloadBytes) ||
      payloadBytes < 0 ||
      hash.byteLength !== 32
    )
      throw new RangeError('Invalid bundle terminal');
    const metadata: SceneBundleTerminalMetadata = {
      type: 'terminal',
      count,
      payloadBytes,
      hash: hex(hash),
    };
    return frame(metadata, new Uint8Array());
  }

  /** Возвращает контрольную сумму в шестнадцатеричном виде. */
  static hashHex(hash: Uint8Array): string {
    return hex(hash);
  }

  /**
   * Проверяет поток и передаёт каждый подтверждённый кадр получателю.
   *
   * Успешное завершение возможно только после проверки завершающего кадра и EOF.
   * При ошибке чтение отменяется, чтобы освободить поток.
   *
   * @param stream Бинарный поток кадров.
   * @param receive Асинхронная обработка проверенного кадра.
   * @returns Метаданные проверенного завершающего кадра.
   */
  static async consume(
    stream: ReadableStream<Uint8Array>,
    receive: (
      metadata: SceneBundleDataMetadata,
      payload: Uint8Array,
      prefixHash: string,
    ) => Promise<void>,
  ): Promise<SceneBundleTerminalMetadata> {
    const reader = new BundleByteReader(stream);
    let hash = await this.initialHash();
    let ordinal = 0;
    let payloadBytes = 0;

    try {
      const magic = await reader.read(MAGIC.byteLength);
      if (!magic || hex(magic) !== hex(MAGIC)) {
        throw new Error('Invalid bundle prefix');
      }

      while (true) {
        const lengths = await reader.read(8);
        if (!lengths) {
          throw new Error('Bundle terminal is missing');
        }

        const view = new DataView(lengths.buffer);
        const metadataLength = view.getUint32(0, false);
        const payloadLength = view.getUint32(4, false);
        if (
          metadataLength > MAX_METADATA_BYTES ||
          payloadLength > 1024 * 1024
        ) {
          throw new Error('Bundle frame exceeds size limit');
        }

        const metadataBytes = await reader.read(metadataLength);
        const payload = await reader.read(payloadLength);

        if (!metadataBytes || !payload) {
          throw new Error('Truncated bundle frame');
        }

        const value: unknown = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes),
        );

        if (isTerminal(value)) {
          if (
            payloadLength ||
            value.count !== ordinal ||
            value.payloadBytes !== payloadBytes ||
            value.hash !== hex(hash) ||
            !(await reader.end())
          )
            throw new Error('Invalid bundle terminal');

          return value;
        }

        if (
          !isDataMetadata(value) ||
          value.ordinal !== ordinal ||
          value.byteLength !== payloadLength ||
          payloadLength > payloadLimit(value.kind) ||
          value.digest !== hex(await sha256(payload))
        )
          throw new Error('Invalid bundle data frame');

        const inputHash = new Uint8Array(32 + 4 + metadataLength + 4 + 32);
        inputHash.set(hash, 0);
        inputHash.set(lengths.subarray(0, 4), 32);
        inputHash.set(metadataBytes, 36);
        inputHash.set(lengths.subarray(4, 8), 36 + metadataLength);
        inputHash.set(await sha256(payload), 40 + metadataLength);
        hash = await sha256(inputHash);

        await receive(value, payload, hex(hash));
        ordinal++;
        payloadBytes += payloadLength;

        if (ordinal > 100_000 || payloadBytes > 256 * 1024 * 1024) {
          throw new Error('Bundle exceeds limits');
        }
      }
    } finally {
      await reader.cancel();
    }
  }
}
