import { ThemeEnum } from '@wm/shared/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    example: 'CryptoKnight',
    description: 'Public display name visible to all users',
  })
  @IsString()
  @IsOptional()
  @Length(2, 128)
  nickname?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example: 'Alexander',
    description: 'User given name',
  })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example: 'Mercer',
    description: 'User family name',
  })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example: 'Edward',
    description: 'User middle name or patronymic, if applicable',
  })
  @IsOptional()
  @IsString()
  middleName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example: '+79994777111',
    description: 'Primary contact number in E164 international format',
  })
  @IsOptional()
  @IsString()
  @Length(8, 16)
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message:
      'Phone number must be a valid E.164 phone number (e.g. +79994777111)',
  })
  phoneNumber?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example: '1984-11-28',
    description: 'Date of birth following the YYYY-MM-DD standard',
  })
  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example:
      'Managing Director with 15+ years of experience in corporate finance and asset management',
    description: 'Professional profile biography or summary',
  })
  @IsOptional()
  @IsString()
  bio?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example: 'https://company.com',
    description: 'Absolute URL pointing to the hosted profile image asset',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    required: false,
    example: 'en',
    description: 'Preferred system interface language code (ISO 639-1)',
  })
  @IsOptional()
  @IsString()
  language?: string | null;

  @ApiPropertyOptional({
    enum: ThemeEnum,
    nullable: true,
    required: false,
    example: 'DARK',
    description: 'Active application interface visual theme preset',
  })
  @IsOptional()
  @IsEnum(ThemeEnum)
  theme?: ThemeEnum;
}
