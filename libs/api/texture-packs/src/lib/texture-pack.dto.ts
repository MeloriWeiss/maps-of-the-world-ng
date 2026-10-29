import { Type } from 'class-transformer';
import { TextureKind, textureKinds } from '@wm/shared/workshop';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Проверенные название и описание нового набора текстур. */
export class CreateTexturePackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/** Изменяемые поля метаданных набора текстур. */
export class UpdateTexturePackDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/** Параметры выборки текстур указанного вида и страницы. */
export class TexturePageQueryDto {
  @IsOptional()
  @IsIn(textureKinds)
  kind?: TextureKind;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 24;
}

/** Вид текстуры для запросов, где значение может быть опущено. */
export class TextureKindDto {
  @IsOptional()
  @IsIn(textureKinds)
  kind: TextureKind = 'SURFACE';
}

/** Параметры постраничной выборки каталога наборов текстур. */
export class TexturePackCatalogQueryDto {
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

/** Новое состояние публикации набора текстур. */
export class UpdateTexturePackPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
