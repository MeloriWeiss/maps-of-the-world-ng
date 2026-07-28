import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaMainService } from '@wm/api/database-main';
import { UploadedTextureFile } from './texture-file.interface';
import { TextureStorageService } from './texture-storage.service';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

@Injectable()
export class TexturesService {
  constructor(
    private readonly prisma: PrismaMainService,
    private readonly storage: TextureStorageService,
  ) {}

  list(accountId: number) {
    return this.prisma.texture.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
      },
    });
  }

  async upload(accountId: number, name: string, file?: UploadedTextureFile) {
    if (!file) throw new BadRequestException('Texture file is required');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only PNG, JPEG and WebP are supported');
    }
    if (!this.#hasValidSignature(file)) {
      throw new BadRequestException(
        'File contents do not match its image type',
      );
    }

    const extension = this.#extension(file.mimetype);
    const objectKey = `${accountId}-${randomUUID()}.${extension}`;
    await this.storage.put(objectKey, file.buffer, file.mimetype);

    return this.prisma.texture.create({
      data: {
        name,
        objectKey,
        mimeType: file.mimetype,
        size: file.size,
        accountId,
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
      },
    });
  }

  async getFile(id: string) {
    const texture = await this.prisma.texture.findUnique({
      where: { id },
      select: { objectKey: true, mimeType: true },
    });
    if (!texture) throw new NotFoundException('Texture not found');

    return {
      body: await this.storage.get(texture.objectKey),
      mimeType: texture.mimeType,
    };
  }

  #extension(mimeType: string): string {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/webp') return 'webp';
    return 'png';
  }

  #hasValidSignature(file: UploadedTextureFile): boolean {
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
}
