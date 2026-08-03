import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListForumDiscussionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;
}

export class CreateForumDiscussionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20_000)
  post!: string;

  @IsString()
  @MaxLength(80)
  category!: string;
}

export class CreateForumCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  comment!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;
}
