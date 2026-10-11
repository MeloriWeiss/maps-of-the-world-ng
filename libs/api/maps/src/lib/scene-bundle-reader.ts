import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';

const magic = Buffer.from('WMSAVE1\n');
const seed = Buffer.from('wm-scene-bundle-v1');
const decoder = new TextDecoder('utf-8', { fatal: true });

export interface SceneUploadFrame {
  type: 'data';
  kind: 'page' | 'tile';
  ordinal: number;
  partKey: string;
  digest: string;
  byteLength: number;
  cellX?: number;
  cellY?: number;
  pageId?: number;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  deleted?: boolean;
  level?: number;
  x?: number;
  y?: number;
}

class ByteReader {
  readonly #source: AsyncIterator<Buffer>;
  #chunk = Buffer.alloc(0);
  #offset = 0;

  constructor(source: AsyncIterable<Buffer>) {
    this.#source = source[Symbol.asyncIterator]();
  }

  async read(length: number): Promise<Buffer | null> {
    if (!Number.isSafeInteger(length) || length < 0 || length > 350_000)
      throw new BadRequestException('Invalid bundle frame length');
    const result = Buffer.allocUnsafe(length);
    let copied = 0;
    while (copied < length) {
      if (this.#offset === this.#chunk.length) {
        const next = await this.#source.next();
        if (next.done) {
          if (!copied) return null;
          throw new BadRequestException('Truncated map bundle');
        }
        this.#chunk = next.value;
        this.#offset = 0;
        continue;
      }
      const take = Math.min(length - copied, this.#chunk.length - this.#offset);
      this.#chunk.copy(result, copied, this.#offset, this.#offset + take);
      this.#offset += take;
      copied += take;
    }
    return result;
  }
}

function digest(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest();
}

function dataFrame(
  value: unknown,
  payloadLength: number,
  ordinal: number,
): value is SceneUploadFrame {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SceneUploadFrame>;
  if (
    item.type !== 'data' ||
    (item.kind !== 'page' && item.kind !== 'tile') ||
    item.ordinal !== ordinal ||
    typeof item.partKey !== 'string' ||
    !item.partKey ||
    item.byteLength !== payloadLength ||
    typeof item.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(item.digest)
  )
    return false;
  if (item.kind === 'page')
    return (
      payloadLength <= 256 * 1024 &&
      [item.cellX, item.cellY, item.pageId].every(Number.isSafeInteger) &&
      [item.minX, item.minY, item.maxX, item.maxY].every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      ) &&
      (item.deleted === undefined || typeof item.deleted === 'boolean')
    );
  return (
    payloadLength <= 350_000 &&
    [item.level, item.x, item.y].every(Number.isSafeInteger)
  );
}

/** Validates a bounded upload frame by frame before handing each part to staging. */
export async function consumeSceneUpload(
  source: AsyncIterable<Buffer>,
  receive: (frame: SceneUploadFrame, payload: Buffer) => Promise<void>,
) {
  const reader = new ByteReader(source);
  const prefix = await reader.read(magic.length);
  if (!prefix?.equals(magic))
    throw new BadRequestException('Invalid map bundle prefix');
  let chain = digest(seed);
  let count = 0;
  let payloadBytes = 0;
  let wireBytes = magic.length;
  while (true) {
    const lengths = await reader.read(8);
    if (!lengths) throw new BadRequestException('Map bundle has no terminal');
    const metadataLength = lengths.readUInt32BE(0);
    const payloadLength = lengths.readUInt32BE(4);
    wireBytes += 8 + metadataLength + payloadLength;
    if (wireBytes > 270 * 1024 * 1024)
      throw new BadRequestException('Map bundle exceeds limit');
    if (!metadataLength || metadataLength > 4096 || payloadLength > 350_000)
      throw new BadRequestException('Map bundle frame exceeds limit');
    const metadata = await reader.read(metadataLength);
    const payload = await reader.read(payloadLength);
    if (!metadata || !payload)
      throw new BadRequestException('Truncated map bundle');
    let value: unknown;
    try {
      value = JSON.parse(decoder.decode(metadata));
    } catch {
      throw new BadRequestException('Invalid map bundle metadata');
    }
    if (
      value &&
      typeof value === 'object' &&
      'type' in value &&
      value.type === 'terminal'
    ) {
      const terminal = value as {
        count?: unknown;
        payloadBytes?: unknown;
        hash?: unknown;
      };
      if (
        payloadLength ||
        terminal.count !== count ||
        terminal.payloadBytes !== payloadBytes ||
        terminal.hash !== chain.toString('hex') ||
        (await reader.read(1)) !== null
      )
        throw new BadRequestException('Invalid map bundle terminal');
      return { count, payloadBytes, hash: chain.toString('hex') };
    }
    if (
      !dataFrame(value, payloadLength, count) ||
      value.digest !== digest(payload).toString('hex')
    )
      throw new BadRequestException('Invalid map bundle part');
    const payloadHash = digest(payload);
    chain = createHash('sha256')
      .update(chain)
      .update(lengths.subarray(0, 4))
      .update(metadata)
      .update(lengths.subarray(4, 8))
      .update(payloadHash)
      .digest();
    await receive(value, payload);
    count++;
    payloadBytes += payloadLength;
    if (count > 10_000 || payloadBytes > 256 * 1024 * 1024)
      throw new BadRequestException('Map bundle exceeds limit');
  }
}
