import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessRequest,
  JwtAccessGuard,
  OptionalAccessRequest,
  OptionalJwtAccessGuard,
} from '@wm/api/auth';
import { Response } from 'express';
import { CopySceneDto, SaveSceneDto } from './map-scene.dto';
import { MapSceneService } from './map-scene.service';

@Controller('maps/:id')
@ApiTags('maps')
export class MapSceneController {
  constructor(private readonly scenes: MapSceneService) {}

  @Get('chunks/:key')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Read a visible map chunk at a specific revision' })
  chunk(
    @Param('id', ParseIntPipe) id: number,
    @Param('key') key: string,
    @Query('revision', ParseIntPipe) revision: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.scenes.chunk(id, key, revision, request.user?.profileId);
  }

  @Get('overview')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-cache')
  @ApiOperation({ summary: 'Read the last saved continuous map overview' })
  async overview(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: OptionalAccessRequest,
    @Res() response: Response,
  ) {
    response
      .type('image/png')
      .send(await this.scenes.overview(id, request.user?.profileId));
  }

  @Put('scene')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({
    summary:
      'Atomically save changed map chunks and manifest with revision conflict protection',
  })
  save(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AccessRequest,
    @Body() dto: SaveSceneDto,
  ) {
    return this.scenes.save(id, request.user.profileId, dto);
  }

  @Post('scene')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Copy an accessible map scene into an owned map' })
  copy(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AccessRequest,
    @Body() dto: CopySceneDto,
  ) {
    return this.scenes.copy(id, request.user.profileId, dto.sourceMapId);
  }
}
