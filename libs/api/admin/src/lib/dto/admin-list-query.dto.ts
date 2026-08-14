import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const adminContentVisibilities = ['visible', 'hidden'] as const;
export const adminContentPublicationStatuses = ['published', 'draft'] as const;

export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsIn(adminContentVisibilities)
  visibility?: (typeof adminContentVisibilities)[number];

  @IsOptional()
  @IsIn(adminContentPublicationStatuses)
  publication?: (typeof adminContentPublicationStatuses)[number];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
