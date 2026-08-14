import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const adminAuditActions = [
  'USER_ROLE_CHANGED',
  'USER_STATUS_CHANGED',
  'CONTENT_VISIBILITY_CHANGED',
] as const;

export const adminAuditTargetTypes = [
  'USER',
  'MAP',
  'TEXTURE_PACK',
  'FORUM_DISCUSSION',
] as const;

export class AdminAuditQueryDto {
  @ApiPropertyOptional({ description: 'Actor nickname, username or email' })
  @IsOptional()
  @IsString()
  actor?: string;

  @ApiPropertyOptional({ enum: adminAuditActions })
  @IsOptional()
  @IsIn(adminAuditActions)
  action?: (typeof adminAuditActions)[number];

  @ApiPropertyOptional({ enum: adminAuditTargetTypes })
  @IsOptional()
  @IsIn(adminAuditTargetTypes)
  targetType?: (typeof adminAuditTargetTypes)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
