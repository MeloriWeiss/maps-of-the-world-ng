import {
  IsInt,
  IsIn,
  IsBoolean,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ListForumDiscussionsDto {
  @ApiPropertyOptional({ enum: ['active', 'new', 'unanswered'] })
  @IsOptional()
  @IsIn(['active', 'new', 'unanswered'])
  sort?: 'active' | 'new' | 'unanswered';

  @ApiPropertyOptional({ enum: ['mine'] })
  @IsOptional()
  @IsIn(['mine'])
  scope?: 'mine';
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
  @Transform(trimText)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(20_000)
  post!: string;

  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category!: string;
}

export class CreateForumCommentDto {
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  comment!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;
}

export class ForumCommentsQueryDto {
  @ApiPropertyOptional({
    enum: ['flat', 'tree'],
    description:
      'Tree mode paginates siblings; omit parentId for root comments',
  })
  @IsOptional()
  @IsIn(['flat', 'tree'])
  view?: 'flat' | 'tree';

  @ApiPropertyOptional({
    description: 'Load direct replies to this comment in tree mode',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;

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

  @ApiPropertyOptional({ description: 'Find the page containing this comment' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  commentId?: number;
}

export class ForumDetailsQueryDto {
  @IsOptional()
  @IsIn(['false', 'true'])
  includeComments?: string;
}

export class EditForumCommentDto {
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  comment!: string;
}

export class ModerateForumDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class ForumCommentVisibilityDto {
  @IsBoolean()
  isHidden!: boolean;
}
