import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  AccessRequest,
  JwtAccessGuard,
  OptionalAccessRequest,
  OptionalJwtAccessGuard,
} from '@wm/api/auth';
import {
  PublishSceneCommitDto,
  SceneContainersQueryDto,
  SceneObjectsQueryDto,
  SceneTileBlockQueryDto,
  SceneViewportQueryDto,
  StartSceneCommitDto,
} from './map-scene-v4.dto';
import { MapSceneV4Service } from './map-scene-v4.service';
import { MapSceneCommitService } from './map-scene-commit.service';

@Controller('maps/:id')
@ApiTags('maps')
export class MapSceneV4Controller {
  constructor(
    private readonly scenes: MapSceneV4Service,
    private readonly commits: MapSceneCommitService,
  ) {}

  @Get('scene')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Read a compact v4 map scene header and bootstrap previews',
  })
  scene(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.scene(id, request.user?.profileId);
  }

  @Get('chunks')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Page spatial map scene descriptors for a viewport',
  })
  pages(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: SceneViewportQueryDto,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.pages(id, query, request.user?.profileId);
  }

  @Get('chunks/:cellX/:cellY/:pageId')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Read a single bounded geometry page at a map revision',
  })
  page(
    @Param('id', ParseIntPipe) id: number,
    @Param('cellX', ParseIntPipe) cellX: number,
    @Param('cellY', ParseIntPipe) cellY: number,
    @Param('pageId', ParseIntPipe) pageId: number,
    @Query('revision', ParseIntPipe) revision: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.page(
      id,
      cellX,
      cellY,
      pageId,
      revision,
      request.user?.profileId,
    );
  }

  @Get('objects')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Search map objects visible in a viewport' })
  objects(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: SceneObjectsQueryDto,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.objects(id, query, request.user?.profileId);
  }

  @Get('objects/:objectId')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Read one map object and its first page of parts' })
  object(
    @Param('id', ParseIntPipe) id: number,
    @Param('objectId') objectId: string,
    @Query('revision', ParseIntPipe) revision: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.object(id, objectId, revision, request.user?.profileId);
  }

  @Get('containers')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Page direct child layers and groups' })
  containers(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: SceneContainersQueryDto,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.containers(id, query, request.user?.profileId);
  }

  @Get('containers/:containerId')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Read a container and its ancestor path' })
  containerPath(
    @Param('id', ParseIntPipe) id: number,
    @Param('containerId') containerId: string,
    @Query('revision', ParseIntPipe) revision: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.containerPath(
      id,
      containerId,
      revision,
      request.user?.profileId,
    );
  }

  @Get('containers/:containerId/coverage')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Read the indexed bounds of a container and its descendants',
  })
  containerCoverage(
    @Param('id', ParseIntPipe) id: number,
    @Param('containerId') containerId: string,
    @Query('revision', ParseIntPipe) revision: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.containerCoverage(
      id,
      containerId,
      revision,
      request.user?.profileId,
    );
  }

  @Get('tiles')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'List available preview tiles in one 8 by 8 block' })
  tiles(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: SceneTileBlockQueryDto,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.tiles(id, query, request.user?.profileId);
  }

  @Get('tile-packs/:level/:x/:y')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Read up to four adjacent preview PNGs in one binary response',
  })
  async tilePack(
    @Param('id', ParseIntPipe) id: number,
    @Param('level', ParseIntPipe) level: number,
    @Param('x', ParseIntPipe) x: number,
    @Param('y', ParseIntPipe) y: number,
    @Query('revision', ParseIntPipe) revision: number,
    @Query('mask', ParseIntPipe) mask: number,
    @Req() request: OptionalAccessRequest,
    @Res() response: Response,
  ) {
    response
      .type('application/octet-stream')
      .send(
        await this.scenes.tilePack(
          id,
          level,
          x,
          y,
          revision,
          mask,
          request.user?.profileId,
        ),
      );
  }

  @Get('tiles/:level/:x/:y')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Read a saved map preview tile' })
  async tile(
    @Param('id', ParseIntPipe) id: number,
    @Param('level', ParseIntPipe) level: number,
    @Param('x', ParseIntPipe) x: number,
    @Param('y', ParseIntPipe) y: number,
    @Query('revision', ParseIntPipe) revision: number,
    @Req() request: OptionalAccessRequest,
    @Res() response: Response,
  ) {
    response
      .type('image/png')
      .send(
        await this.scenes.tile(
          id,
          level,
          x,
          y,
          revision,
          request.user?.profileId,
        ),
      );
  }

  @Post('scene-commits')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Start an idempotent staged map scene save' })
  start(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AccessRequest,
    @Body() dto: StartSceneCommitDto,
  ) {
    return this.scenes.startCommit(id, request.user.profileId, dto);
  }

  @Get('scene-commits/:commitId')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Read staged save status after a lost response' })
  status(
    @Param('id', ParseIntPipe) id: number,
    @Param('commitId') commitId: string,
    @Req() request: AccessRequest,
  ) {
    return this.scenes.commitStatus(id, request.user.profileId, commitId);
  }

  @Put('scene-commits/:commitId/source-tiles')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({
    summary:
      'Copy the next bounded batch of source previews into destination staging',
  })
  copySourceTiles(
    @Param('id', ParseIntPipe) id: number,
    @Param('commitId') commitId: string,
    @Req() request: AccessRequest,
  ) {
    return this.scenes.copySourceTiles(id, request.user.profileId, commitId);
  }

  @Put('scene-commits/:commitId/bundle')
  @UseGuards(JwtAccessGuard)
  @ApiConsumes('application/vnd.wm.scene-bundle')
  @ApiOperation({
    summary:
      'Stage one bounded binary bundle of geometry pages and preview tiles',
  })
  bundle(
    @Param('id', ParseIntPipe) id: number,
    @Param('commitId') commitId: string,
    @Req() request: AccessRequest,
  ) {
    return this.scenes.stageBundle(
      id,
      request.user.profileId,
      commitId,
      request,
    );
  }

  @Patch('scene-commits/:commitId')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({
    summary:
      'Atomically publish geometry and previews of a staged map revision',
  })
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Param('commitId') commitId: string,
    @Req() request: AccessRequest,
    @Body() dto: PublishSceneCommitDto,
  ) {
    const result = await this.commits.publish(
      id,
      request.user.profileId,
      commitId,
      dto,
    );
    const scene = await this.scenes.scene(id, request.user.profileId);
    return { ...result, scene };
  }
}
