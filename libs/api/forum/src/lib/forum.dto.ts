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

/** Параметры сортировки, фильтрации и пагинации списка тем форума. */
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

/** Проверенные поля новой темы форума. */
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

/** Проверенные поля нового комментария и его необязательной родительской записи. */
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

/** Параметры выборки комментариев, включая режим дерева и поиск ветки. */
export class ForumCommentsQueryDto {
  @ApiPropertyOptional({
    enum: ['flat', 'tree'],
    description:
      'В режиме дерева выполняется пагинация соседних комментариев; для корневых комментариев parentId не указывается',
  })
  @IsOptional()
  @IsIn(['flat', 'tree'])
  view?: 'flat' | 'tree';

  @ApiPropertyOptional({
    description: 'Загрузить прямые ответы на этот комментарий в режиме дерева',
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

  @ApiPropertyOptional({
    description: 'Найти страницу, содержащую комментарий',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  commentId?: number;
}

/** Параметры загрузки подробностей темы форума. */
export class ForumDetailsQueryDto {
  @IsOptional()
  @IsIn(['false', 'true'])
  includeComments?: string;
}

/** Проверенный текст изменяемого комментария. */
export class EditForumCommentDto {
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  comment!: string;
}

/** Изменения закрепления и закрытия темы модератором. */
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

/** Новое состояние видимости комментария для модерации. */
export class ForumCommentVisibilityDto {
  @IsBoolean()
  isHidden!: boolean;
}
