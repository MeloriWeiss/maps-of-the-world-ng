import { ApiProperty } from '@nestjs/swagger';
import { ThemeEnum } from '@wm/shared/common';

export class AccountDto {
  @ApiProperty({
    example: 'CryptoKnight',
    description: 'Public display name visible to all users',
  })
  nickname!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'Alexander',
    description: 'User given name',
  })
  firstName?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'Mercer',
    description: 'User family name',
  })
  lastName?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'Edward',
    description: 'User middle name or patronymic, if applicable',
  })
  middleName?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: '+79994777111',
    description: 'Primary contact number in E164 international format',
  })
  phoneNumber?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: '1984-11-28',
    description: 'Date of birth following the YYYY-MM-DD standard',
  })
  birthDate?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example:
      'Managing Director with 15+ years of experience in corporate finance and asset management',
    description: 'Professional profile biography or summary',
  })
  bio?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'https://company.com',
    description: 'Absolute URL pointing to the hosted profile image asset',
  })
  avatarUrl?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'en',
    description: 'Preferred system interface language code (ISO 639-1)',
  })
  language?: string | null;

  @ApiProperty({
    enum: ThemeEnum,
    nullable: true,
    required: false,
    example: 'dark',
    description: 'Active application interface visual theme preset',
  })
  theme!: ThemeEnum;

  @ApiProperty({
    example: '2026-07-24T20:55:32.105Z',
    description: 'Account registration timestamp in ISO 8601 UTC format',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-07-25T01:15:00.000Z',
    description:
      'Last verified profile modification timestamp in ISO 8601 UTC format',
  })
  updatedAt!: string;
}

export class ProfileSummaryDto {
  @ApiProperty({
    example: 'CryptoKnight',
    description: 'Public display name',
  })
  nickname!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://company.com/avatar.webp',
    description: 'Public profile avatar URL',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Создаю фэнтезийные карты и текстуры',
    description: 'Public author biography',
  })
  bio!: string | null;

  @ApiProperty({
    example: '2026-07-24T20:55:32.105Z',
    description: 'Account registration timestamp',
  })
  createdAt!: string;

  @ApiProperty({
    example: 209,
    description: 'Total likes received by all supported user publications',
  })
  likesReceived!: number;

  @ApiProperty({
    example: 12,
    description: 'Number of published maps',
  })
  publishedMapsCount!: number;

  @ApiProperty({
    example: 4,
    description: 'Number of published texture packs',
  })
  publishedTexturePacksCount!: number;
}
