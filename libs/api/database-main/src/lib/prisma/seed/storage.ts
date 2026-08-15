import { ConfigService } from '@nestjs/config';
import { S3ObjectStorageService } from '@wm/api/shared';
import { readFile } from 'node:fs/promises';

const placeholderPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export interface SeedImage {
  objectKey: string;
  sourcePath?: string;
}

export async function uploadSeedImages(images: SeedImage[]) {
  const requiredVariables = [
    'OBJECT_STORAGE_ENDPOINT',
    'OBJECT_STORAGE_REGION',
    'OBJECT_STORAGE_BUCKET',
    'OBJECT_STORAGE_ACCESS_KEY',
    'OBJECT_STORAGE_SECRET_KEY',
    'OBJECT_STORAGE_FORCE_PATH_STYLE',
  ];
  if (requiredVariables.some((name) => !process.env[name])) {
    console.warn(
      'Object storage is not configured; placeholder images were skipped.',
    );
    return;
  }

  const storage = new S3ObjectStorageService(new ConfigService(process.env));
  try {
    for (let offset = 0; offset < images.length; offset += 20) {
      await Promise.all(
        images.slice(offset, offset + 20).map(async (image) => {
          const body = image.sourcePath
            ? await readFile(image.sourcePath)
            : placeholderPng;
          return storage.put({
            key: image.objectKey,
            body,
            contentType: 'image/png',
          });
        }),
      );
    }
    console.log(`Object storage seed images: ${images.length}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Object storage is unavailable; placeholders were skipped: ${message}`,
    );
  }
}
