import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaMainService } from '@wm/api/database-main';
import {
  imageExtension,
  OBJECT_STORAGE,
  ObjectStorage,
  validateUploadedImage,
} from '@wm/api/shared';
import { UploadedTextureFile } from './texture-file.interface';
import { TextureKind } from '@wm/shared/workshop';

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
    kind: TextureKind = 'SURFACE',
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
          kind,
          objectKey,
          mimeType: file.mimetype,
          size: file.size,
          accountId,
          packId,
        },
        select: {
          id: true,
          kind: true,
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

  #readableTexture(id: string, accountId?: number): Prisma.TextureWhereInput {
    return {
      id,
      OR: [
        {
          accountId: accountId ?? -1,
          deletedAt: null,
          pack: { deletedAt: null },
        },
        {
          deletedAt: null,
          pack: { isPublished: true, isHidden: false, deletedAt: null },
        },
        {
          sceneReferences: {
            some: {
              page: {
                map: {
                  OR: [
                    { accountId: accountId ?? -1 },
                    { isPublished: true, isHidden: false },
                  ],
                },
              },
            },
          },
        },
      ],
    };
  }

  async getFile(id: string, accountId?: number) {
    const texture = await this.prisma.texture.findFirst({
      where: this.#readableTexture(id, accountId),
      select: { objectKey: true, mimeType: true },
    });
    if (!texture) throw new NotFoundException('Texture not found');

    return {
      body: await this.storage.get(texture.objectKey),
      mimeType: texture.mimeType,
    };
  }

  async getMetadata(id: string, accountId?: number) {
    const texture = await this.prisma.texture.findFirst({
      where: this.#readableTexture(id, accountId),
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        packId: true,
        kind: true,
      },
    });
    if (!texture) throw new NotFoundException('Texture not found');
    return texture;
  }

  async updateKind(
    accountId: number,
    packId: string,
    id: string,
    kind: TextureKind,
  ) {
    const result = await this.prisma.texture.updateMany({
      where: {
        id,
        packId,
        accountId,
        deletedAt: null,
        pack: { deletedAt: null },
      },
      data: { kind },
    });
    if (!result.count) throw new NotFoundException('Texture not found');
    return { id, kind };
  }

  async remove(accountId: number, packId: string, textureId: string) {
    const texture = await this.prisma.texture.findFirst({
      where: {
        id: textureId,
        packId,
        accountId,
        deletedAt: null,
        pack: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!texture) throw new NotFoundException('Texture not found');

    await this.prisma.texture.update({
      where: { id: texture.id },
      data: { deletedAt: new Date() },
    });
    return { id: texture.id };
  }
}
