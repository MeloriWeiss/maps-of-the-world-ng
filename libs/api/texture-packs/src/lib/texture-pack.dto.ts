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

export class TextureKindDto {
  @IsOptional()
  @IsIn(textureKinds)
  kind: TextureKind = 'SURFACE';
}

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

export class UpdateTexturePackPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
