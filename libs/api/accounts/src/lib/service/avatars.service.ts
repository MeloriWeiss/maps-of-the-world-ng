import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  imageExtension,
  imageMimeTypeFromKey,
  OBJECT_STORAGE,
  ObjectStorage,
  UploadedImageFile,
  validateUploadedImage,
} from '@wm/api/api-shared';
import { PrismaMainService } from '@wm/api/database-main';

@Injectable()
export class AvatarsService {
  #prisma: PrismaMainService;
  #storage: ObjectStorage;

  constructor(
    @Inject(PrismaMainService) prisma: PrismaMainService,
    @Inject(OBJECT_STORAGE) storage: ObjectStorage,
  ) {
    this.#prisma = prisma;
    this.#storage = storage;
  }

  async upload(accountId: number, file: UploadedImageFile) {
    validateUploadedImage(file);
    const account = await this.#prisma.personalAccount.findUnique({
      where: { id: accountId },
      select: { avatarUrl: true, userId: true },
    });
    if (!account) throw new NotFoundException('Account not found');

    const objectKey =
      `avatars/${accountId}/${randomUUID()}.` + imageExtension(file.mimetype);
    await this.#storage.put({
      key: objectKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    try {
      await this.#prisma.personalAccount.update({
        where: { id: accountId },
        data: { avatarUrl: objectKey },
      });
    } catch (error) {
      await this.#storage.delete(objectKey).catch(() => undefined);
      throw error;
    }

    if (account.avatarUrl) {
      await this.#storage.delete(account.avatarUrl).catch(() => undefined);
    }

    return {
      avatarUrl: this.publicUrl(account.userId, objectKey),
    };
  }

  async getByUserId(userId: number) {
    const account = await this.#prisma.personalAccount.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });
    if (!account?.avatarUrl) throw new NotFoundException('Avatar not found');

    return {
      body: await this.#storage.get(account.avatarUrl),
      mimeType: imageMimeTypeFromKey(account.avatarUrl),
    };
  }

  publicUrl(userId: number, objectKey: string) {
    if (objectKey.startsWith('https://') || objectKey.startsWith('http://')) {
      return objectKey;
    }
    return `/api/accounts/profiles/${userId}/avatar?v=${encodeURIComponent(objectKey)}`;
  }
}
