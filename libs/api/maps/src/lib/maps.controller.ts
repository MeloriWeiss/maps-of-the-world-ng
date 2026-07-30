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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessRequest, JwtAccessGuard } from '@wm/api/api-auth';
import { SaveMapDto, UpdateMapPublicationDto } from './maps.dto';
import { MapsService } from './maps.service';

@Controller('maps')
@ApiTags('maps')
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get('published')
  @ApiOperation({ summary: 'List published maps' })
  listCatalog() {
    return this.maps.listCatalog();
  }

  @Get('published/:id')
  @ApiOperation({ summary: 'Read a published map for viewing' })
  getPublished(@Param('id', ParseIntPipe) id: number) {
    return this.maps.getPublished(id);
  }

  @Get('authors/:userId')
  @ApiOperation({ summary: 'List published maps by author' })
  listPublished(@Param('userId', ParseIntPipe) userId: number) {
    return this.maps.listPublished(userId);
  }

  @Get()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'List maps owned by the current account' })
  list(@Req() request: AccessRequest) {
    return this.maps.list(request.user.profileId);
  }

  @Get(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Read an owned map for editing' })
  get(@Param('id', ParseIntPipe) id: number, @Req() request: AccessRequest) {
    return this.maps.get(id, request.user.profileId);
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Create a map' })
  create(@Body() dto: SaveMapDto, @Req() request: AccessRequest) {
    return this.maps.create(request.user.profileId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update an owned map' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveMapDto,
    @Req() request: AccessRequest,
  ) {
    return this.maps.update(id, request.user.profileId, dto);
  }

  @Patch(':id/publication')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Publish or unpublish an owned map' })
  updatePublication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMapPublicationDto,
    @Req() request: AccessRequest,
  ) {
    return this.maps.updatePublication(
      id,
      request.user.profileId,
      dto.isPublished,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Delete an owned map' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AccessRequest) {
    return this.maps.remove(id, request.user.profileId);
  }
}
