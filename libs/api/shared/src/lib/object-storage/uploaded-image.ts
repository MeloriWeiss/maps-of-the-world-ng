import { BadRequestException } from '@nestjs/common';

/** Загруженное изображение до проверки и сохранения. */
export interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Проверяет формат, размер и содержимое загружаемого изображения. */
export function validateUploadedImage(file: UploadedImageFile) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('Only PNG, JPEG and WebP are supported');
  }
  if (!hasValidImageSignature(file)) {
    throw new BadRequestException('File contents do not match its image type');
  }
}

/** Определяет расширение файла для поддерживаемого MIME-типа. */
export function imageExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

/** Определяет MIME-тип изображения по ключу файла. */
export function imageMimeTypeFromKey(objectKey: string): string {
  if (objectKey.endsWith('.jpg')) return 'image/jpeg';
  if (objectKey.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function hasValidImageSignature(file: UploadedImageFile): boolean {
  const bytes = file.buffer;
  if (file.mimetype === 'image/png') {
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (file.mimetype === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
