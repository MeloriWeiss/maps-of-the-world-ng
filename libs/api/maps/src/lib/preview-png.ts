import { inflateSync } from 'node:zlib';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const tileSize = 256;
const maxBytes = 350_000;

function crc32(bytes: Buffer, start: number, end: number) {
  let crc = 0xffffffff;
  for (let offset = start; offset < end; offset++) {
    crc ^= bytes[offset];
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(left: number, above: number, upperLeft: number) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance)
    return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodeRows(raw: Buffer, pixelBytes: number) {
  const stride = tileSize * pixelBytes;
  if (raw.length !== (stride + 1) * tileSize) return false;
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  for (let row = 0; row < tileSize; row++) {
    const start = row * (stride + 1);
    const filter = raw[start];
    if (filter > 4) return false;
    for (let column = 0; column < stride; column++) {
      const left = column >= pixelBytes ? current[column - pixelBytes] : 0;
      const above = previous[column];
      const upperLeft =
        column >= pixelBytes ? previous[column - pixelBytes] : 0;
      const predictor =
        filter === 1
          ? left
          : filter === 2
            ? above
            : filter === 3
              ? Math.floor((left + above) / 2)
              : filter === 4
                ? paeth(left, above, upperLeft)
                : 0;
      current[column] = (raw[start + column + 1] + predictor) & 0xff;
    }
    current.copy(previous);
  }
  return true;
}

/** Проверяет заголовок и допустимый размер изображения PNG превью. */
export function isValidPreviewPng(bytes: Buffer) {
  if (
    bytes.length > maxBytes ||
    bytes.length < 8 + 25 + 12 ||
    !bytes.subarray(0, 8).equals(signature)
  )
    return false;
  let offset = 8;
  let pixelBytes = 0;
  let state: 'header' | 'data' | 'afterData' | 'end' = 'header';
  const imageData: Buffer[] = [];
  let chunks = 0;
  while (offset < bytes.length) {
    if (++chunks > 128 || offset + 12 > bytes.length) return false;
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) return false;
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (crc32(bytes, offset + 4, end - 4) !== bytes.readUInt32BE(end - 4))
      return false;
    const data = bytes.subarray(offset + 8, end - 4);
    if (state === 'header') {
      if (
        type !== 'IHDR' ||
        length !== 13 ||
        data.readUInt32BE(0) !== tileSize ||
        data.readUInt32BE(4) !== tileSize ||
        data[8] !== 8 ||
        (data[9] !== 2 && data[9] !== 6) ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] !== 0
      )
        return false;
      pixelBytes = data[9] === 6 ? 4 : 3;
      state = 'afterData';
    } else if (type === 'IDAT') {
      if (state === 'afterData' && imageData.length > 0) return false;
      imageData.push(data);
      state = 'data';
    } else if (type === 'IEND') {
      if (state === 'afterData' || length !== 0 || end !== bytes.length)
        return false;
      state = 'end';
    } else {
      if (!/^[a-z]$/.test(type[0]) || state === 'end') return false;
      if (state === 'data') state = 'afterData';
    }
    offset = end;
  }
  if (state !== 'end' || imageData.length === 0) return false;
  try {
    const expected = (tileSize * pixelBytes + 1) * tileSize;
    const raw = inflateSync(Buffer.concat(imageData), {
      maxOutputLength: expected + 1,
    });
    return decodeRows(raw, pixelBytes);
  } catch {
    return false;
  }
}
