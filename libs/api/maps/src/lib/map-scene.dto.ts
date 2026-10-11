import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CopySceneDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sourceMapId!: number;
}

export class SceneChunkDto {
  @IsString()
  @Matches(/^-?\d+:-?\d+$/)
  key!: string;

  @IsString()
  @MaxLength(8_000_000)
  body!: string;
}

export class SaveSceneDto {
  @IsInt()
  @Min(0)
  revision!: number;

  @IsString()
  @MaxLength(8_000_000)
  manifest!: string;

  @IsArray()
  @ArrayMaxSize(4096)
  @ValidateNested({ each: true })
  @Type(() => SceneChunkDto)
  chunks!: SceneChunkDto[];

  @IsOptional()
  @IsString()
  @MaxLength(6_000_000)
  overview?: string;
}
