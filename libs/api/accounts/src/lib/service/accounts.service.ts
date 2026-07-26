import { AppTheme, PrismaMainService } from '@wm/api/database-main';
import { AccountResponseDto } from '@wm/shared/accounts';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ThemeEnum } from '@wm/shared/common';
import { UpdateAccountDto } from '../dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaMainService) {}

  async getAccount(profileId: number): Promise<AccountResponseDto> {
    const account = await this.prisma.personalAccount.findUnique({
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
      avatarUrl: account.avatarUrl,
      language: account.language,
      theme: account.theme as unknown as ThemeEnum,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };

    return result;
  }

  async updateAccount(accountId: number, dto: UpdateAccountDto) {
    if (!dto || Object.keys(dto).length === 0)
      throw new BadRequestException('Request body cannot be empty');

    return await this.prisma.personalAccount.update({
      where: { id: accountId },
      data: {
        nickname: dto.nickname,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        phoneNumber: dto.phoneNumber,
        birthDate: dto.birthDate,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        language: dto.language,
        theme: dto.theme ? (dto.theme as unknown as AppTheme) : undefined,
      },
    });
  }
}
