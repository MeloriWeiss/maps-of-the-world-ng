import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessRequest,
  JwtAccessGuard,
  OptionalAccessRequest,
  OptionalJwtAccessGuard,
} from '@wm/api/api-auth';
import { SaveMapDto, UpdateMapPublicationDto } from './maps.dto';
import { MapsService } from './maps.service';

@Controller('maps')
@ApiTags('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get(['', 'catalog', 'published'])
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'List published maps' })
  maps(
    @Req() request: OptionalAccessRequest,
    @Query('authorId') authorId?: string,
  ) {
    return authorId === undefined
      ? this.mapsService.listPublicCatalog(request.user?.profileId)
      : this.mapsService.listPublicByAuthor(
          Number(authorId),
          request.user?.profileId,
        );
  }

  @Get(['public/:id', 'published/:id'])
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'Read a published map for viewing' })
  map(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.mapsService.getPublicMap(id, request.user?.profileId);
  }

  @Get('authors/:userId')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'List published maps by author' })
  listPublicByAuthor(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.mapsService.listPublicByAuthor(userId, request.user?.profileId);
  }

  @Get('mine')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'List maps owned by the current account' })
  listMine(@Req() request: AccessRequest) {
    return this.mapsService.listMine(request.user.profileId);
  }

  @Get('mine/:id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Read an owned map for editing' })
  getOwned(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AccessRequest,
  ) {
    return this.mapsService.getOwned(id, request.user.profileId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'Read a published map for viewing' })
  publicMap(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.mapsService.getPublicMap(id, request.user?.profileId);
  }

  @Post(':id/like')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Like a published map' })
  like(@Param('id', ParseIntPipe) id: number, @Req() request: AccessRequest) {
    return this.mapsService.like(id, request.user.profileId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Remove my like from a map' })
  unlike(@Param('id', ParseIntPipe) id: number, @Req() request: AccessRequest) {
    return this.mapsService.unlike(id, request.user.profileId);
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Create a map' })
  create(@Body() dto: SaveMapDto, @Req() request: AccessRequest) {
    return this.mapsService.create(request.user.profileId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update an owned map' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveMapDto,
    @Req() request: AccessRequest,
  ) {
    return this.mapsService.update(id, request.user.profileId, dto);
  }

  @Patch(':id/publication')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Publish or unpublish an owned map' })
  updatePublication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMapPublicationDto,
    @Req() request: AccessRequest,
  ) {
    return this.mapsService.updatePublication(
      id,
      request.user.profileId,
      dto.isPublished,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Delete an owned map' })
  removeOwned(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AccessRequest,
  ) {
    return this.mapsService.removeOwned(id, request.user.profileId);
  }
}
