import { AppTheme, PrismaMainService } from '@wm/api/database-main';
import { AccountResponseDto } from '@wm/shared/accounts';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ThemeEnum } from '@wm/shared/common';
import { UpdateAccountDto } from '../dto';
import { AvatarsService } from './avatars.service';

@Injectable()
export class AccountsService {
  #prisma: PrismaMainService;
  #avatars: AvatarsService;

  constructor(prisma: PrismaMainService, avatars: AvatarsService) {
    this.#prisma = prisma;
    this.#avatars = avatars;
  }

  async getAccount(profileId: number): Promise<AccountResponseDto> {
    const account = await this.#prisma.personalAccount.findUnique({
      where: {
        id: profileId,
      },
      include: {
        maps: true,
      },
    });

    if (!account) throw new NotFoundException('Account not found');

    const result: AccountResponseDto = {
      nickname: account.nickname,
      firstName: account.firstName,
      lastName: account.lastName,
      middleName: account.middleName,
      phoneNumber: account.phoneNumber,
      birthDate: account.birthDate ?? null,
      bio: account.bio,
      avatarUrl: account.avatarUrl
        ? this.#avatars.publicUrl(account.userId, account.avatarUrl)
        : null,
      language: account.language,
      theme: account.theme as unknown as ThemeEnum,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };

    return result;
  }

  async getMyProfileSummary(accountId: number) {
    const account = await this.#prisma.personalAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        userId: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    return this.#getProfileSummary(account);
  }

  async getPublicProfileSummary(userId: number) {
    const account = await this.#prisma.personalAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        userId: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    return this.#getProfileSummary(account);
  }

  async getMyFavourites(accountId: number) {
    const [mapLikes, texturePackLikes] = await Promise.all([
      this.#prisma.mapLike.findMany({
        where: { accountId, map: { isPublished: true } },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          map: {
            select: {
              id: true,
              name: true,
              description: true,
              likesCount: true,
              commentsCount: true,
              authorAccount: {
                select: { userId: true, nickname: true },
              },
            },
          },
        },
      }),
      this.#prisma.texturePackLike.findMany({
        where: { accountId, texturePack: { isPublished: true } },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          texturePack: {
            select: {
              id: true,
              name: true,
              description: true,
              likesCount: true,
              owner: { select: { userId: true, nickname: true } },
              _count: { select: { textures: true } },
              textures: {
                orderBy: { createdAt: 'desc' },
                take: 4,
                select: {
                  id: true,
                  name: true,
                  mimeType: true,
                  size: true,
                  width: true,
                  height: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      maps: mapLikes.map(({ createdAt, map: { authorAccount, ...map } }) => ({
        ...map,
        likedAt: createdAt,
        author: {
          id: authorAccount.userId,
          nickname: authorAccount.nickname,
        },
      })),
      texturePacks: texturePackLikes.map(
        ({ createdAt, texturePack: { owner, textures, ...pack } }) => ({
          ...pack,
          likedAt: createdAt,
          author: { id: owner.userId, nickname: owner.nickname },
          previewTextures: textures,
        }),
      ),
    };
  }

  async updateAccount(accountId: number, dto: UpdateAccountDto) {
    if (!dto || Object.keys(dto).length === 0)
      throw new BadRequestException('Request body cannot be empty');

    return await this.#prisma.personalAccount.update({
      where: { id: accountId },
      data: {
        nickname: dto.nickname,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        phoneNumber: dto.phoneNumber,
        birthDate: dto.birthDate,
        bio: dto.bio,
        language: dto.language,
        theme: dto.theme ? (dto.theme as unknown as AppTheme) : undefined,
      },
    });
  }

  async #getProfileSummary(account: {
    id: number;
    nickname: string;
    avatarUrl: string | null;
    userId: number;
    bio: string | null;
    createdAt: Date;
  }) {
    const [
      mapLikes,
      texturePackLikes,
      publishedMapsCount,
      publishedTexturePacksCount,
    ] = await Promise.all([
      this.#prisma.map.aggregate({
        where: { accountId: account.id },
        _sum: { likesCount: true },
      }),
      this.#prisma.texturePack.aggregate({
        where: { accountId: account.id },
        _sum: { likesCount: true },
      }),
      this.#prisma.map.count({
        where: { accountId: account.id, isPublished: true },
      }),
      this.#prisma.texturePack.count({
        where: { accountId: account.id, isPublished: true },
      }),
    ]);

    return {
      nickname: account.nickname,
      avatarUrl: account.avatarUrl
        ? this.#avatars.publicUrl(account.userId, account.avatarUrl)
        : null,
      bio: account.bio,
      createdAt: account.createdAt.toISOString(),
      likesReceived:
        (mapLikes._sum.likesCount ?? 0) +
        (texturePackLikes._sum.likesCount ?? 0),
      publishedMapsCount,
      publishedTexturePacksCount,
    };
  }
}
