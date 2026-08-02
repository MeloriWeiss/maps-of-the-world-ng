import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaMainService } from '@wm/api/database-main';
import {
  imageExtension,
  OBJECT_STORAGE,
  ObjectStorage,
  validateUploadedImage,
} from '@wm/api/api-shared';
import { UploadedTextureFile } from './texture-file.interface';

@Injectable()
export class TexturesService {
  constructor(
    private readonly prisma: PrismaMainService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async upload(
    accountId: number,
    name: string,
    file: UploadedTextureFile,
    packId: string,
  ) {
    this.validateFile(file);

    const extension = imageExtension(file.mimetype);
    const objectKey = `${accountId}-${randomUUID()}.${extension}`;
    await this.storage.put({
      key: objectKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    try {
      return await this.prisma.texture.create({
        data: {
          name,
          objectKey,
          mimeType: file.mimetype,
          size: file.size,
          accountId,
          packId,
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
    } catch (error) {
      await this.storage.delete(objectKey).catch(() => undefined);
      throw error;
    }
  }

  validateFile(file: UploadedTextureFile) {
    validateUploadedImage(file);
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

  async getMetadata(id: string) {
    const texture = await this.prisma.texture.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        packId: true,
      },
    });
    if (!texture) throw new NotFoundException('Texture not found');
    return texture;
  }

  async remove(accountId: number, packId: string, textureId: string) {
    const texture = await this.prisma.texture.findFirst({
      where: { id: textureId, packId, accountId },
      select: { id: true, objectKey: true },
    });
    if (!texture) throw new NotFoundException('Texture not found');

    await this.prisma.texture.delete({ where: { id: texture.id } });
    await this.storage.delete(texture.objectKey).catch(() => undefined);
    return { id: texture.id };
  }

  async removeFiles(objectKeys: string[]) {
    await Promise.all(
      objectKeys.map((objectKey) =>
        this.storage.delete(objectKey).catch(() => undefined),
      ),
    );
  }
}
