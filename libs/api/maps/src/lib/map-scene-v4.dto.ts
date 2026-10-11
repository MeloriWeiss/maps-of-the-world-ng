import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  mapChunkSize,
  mapPreviewMaxLevel,
  mapWorldHalfSize,
} from '@wm/shared/workshop';

const lastWorldCell = mapWorldHalfSize / mapChunkSize - 1;

export class SceneViewportQueryDto {
  @Type(() => Number) @IsNumber() x!: number;
  @Type(() => Number) @IsNumber() y!: number;
  @Type(() => Number) @IsNumber() @Min(0.001) width!: number;
  @Type(() => Number) @IsNumber() @Min(0.001) height!: number;
  @Type(() => Number) @IsInt() @Min(0) revision!: number;
  @IsOptional() @IsString() @MaxLength(256) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 64;
  @IsOptional() @IsIn(['true']) includeBody?: 'true';
}

export class SceneTileBlockQueryDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(mapPreviewMaxLevel) level!: number;
  @Type(() => Number)
  @IsInt()
  @Min(-mapWorldHalfSize / mapChunkSize)
  @Max(mapWorldHalfSize / mapChunkSize)
  x!: number;
  @Type(() => Number)
  @IsInt()
  @Min(-mapWorldHalfSize / mapChunkSize)
  @Max(mapWorldHalfSize / mapChunkSize)
  y!: number;
  @Type(() => Number) @IsInt() @Min(0) revision!: number;
}

export class SceneObjectsQueryDto extends SceneViewportQueryDto {
  @IsOptional() @IsString() @MaxLength(100) query?: string;
  @IsOptional()
  @IsIn(['text', 'stamp', 'line', 'rectangle', 'texture'])
  kind?: string;
  @IsOptional() @IsIn(['viewport', 'map']) scope?: 'viewport' | 'map';
}

export class SceneContainersQueryDto {
  @IsOptional() @IsString() @MaxLength(100) parentId?: string;
  @IsOptional() @IsString() @MaxLength(256) cursor?: string;
  @Type(() => Number) @IsInt() @Min(0) revision!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 64;
}

export class StartSceneCommitDto {
  @IsUUID() idempotencyKey!: string;
  @IsInt() @Min(0) expectedRevision!: number;
  @IsOptional() @IsInt() @Min(1) sourceMapId?: number;
  @IsOptional() @IsInt() @Min(0) sourceRevision?: number;
}

export class ScenePagePartDto {
  @IsIn(['page']) kind!: 'page';
  @IsInt() @Min(-lastWorldCell - 1) @Max(lastWorldCell) cellX!: number;
  @IsInt() @Min(-lastWorldCell - 1) @Max(lastWorldCell) cellY!: number;
  @IsInt() @Min(0) @Max(2_147_483_647) pageId!: number;
  @IsNumber() minX!: number;
  @IsNumber() minY!: number;
  @IsNumber() maxX!: number;
  @IsNumber() maxY!: number;
  @IsString() @MaxLength(262_144) body!: string;
  @IsOptional() @IsBoolean() deleted?: boolean;
}

export class SceneContainerChangeDto {
  @IsString() @MaxLength(100) id!: string;
  @IsOptional() @IsString() @MaxLength(100) parentId?: string;
  @IsIn(['layer', 'group']) kind!: 'layer' | 'group';
  @IsString() @MaxLength(120) name!: string;
  @IsBoolean() visible!: boolean;
  @IsBoolean() locked!: boolean;
  @IsNumber() orderKey!: number;
  @IsInt() @Min(0) @Max(1_000_000) childIndex!: number;
  @IsOptional() @IsBoolean() deleted?: boolean;
}

export class PublishSceneCommitDto {
  @IsString() @MaxLength(8_000) header!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SceneContainerChangeDto)
  containers!: SceneContainerChangeDto[];
}
