import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Проверяет параметры поиска и пагинации каталога карт. */
export class MapCatalogQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 9;
}

/** Проверяет поля карты, передаваемые при создании или обновлении. */
export class SaveMapDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/** Проверяет новое состояние публикации карты. */
export class UpdateMapPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
