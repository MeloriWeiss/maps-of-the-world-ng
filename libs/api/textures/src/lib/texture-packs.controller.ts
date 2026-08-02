import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessRequest,
  JwtAccessGuard,
  OptionalAccessRequest,
  OptionalJwtAccessGuard,
} from '@wm/api/api-auth';
import {
  CreateTexturePackDto,
  TexturePageQueryDto,
  UpdateTexturePackDto,
  UpdateTexturePackPublicationDto,
} from './texture-pack.dto';
import { UploadedTextureFile } from './texture-file.interface';
import { TexturePacksService } from './texture-packs.service';

@ApiTags('texture-packs')
@Controller('texture-packs')
export class TexturePacksController {
  constructor(private readonly texturePacks: TexturePacksService) {}

  @Get()
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'List published texture packs' })
  texturePacksList(
    @Req() request: OptionalAccessRequest,
    @Query('authorId') authorId?: string,
  ) {
    return authorId === undefined
      ? this.texturePacks.listPublicCatalog(request.user?.profileId)
      : this.texturePacks.listPublicByAuthor(
          Number(authorId),
          request.user?.profileId,
        );
  }

  @Get('authors/:userId')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'List published texture packs by author' })
  listPublicByAuthor(
    @Param('userId') userId: string,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.texturePacks.listPublicByAuthor(
      Number(userId),
      request.user?.profileId,
    );
  }

  @Get(['public/:id', 'published/:id'])
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'Read a published texture pack' })
  getPublicPack(
    @Param('id') id: string,
    @Req() request: OptionalAccessRequest,
  ) {
    return this.texturePacks.getPublicPack(id, request.user?.profileId);
  }

  @Get(['public/:id/textures', 'published/:id/textures'])
  @ApiOperation({ summary: 'Read one page of published pack textures' })
  listPublicTextures(
    @Param('id') id: string,
    @Query() query: TexturePageQueryDto,
  ) {
    return this.texturePacks.listPublicTextures(id, query);
  }

  @Get('mine')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'List texture packs owned by the current account' })
  listMine(@Req() request: AccessRequest) {
    return this.texturePacks.listMine(request.user.profileId);
  }

  @Get('mine/:id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Read an owned texture pack' })
  getOwned(@Req() request: AccessRequest, @Param('id') id: string) {
    return this.texturePacks.getOwned(request.user.profileId, id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'Read a published texture pack' })
  texturePack(@Param('id') id: string, @Req() request: OptionalAccessRequest) {
    return this.texturePacks.getPublicPack(id, request.user?.profileId);
  }

  @Post(':id/like')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Like a published texture pack' })
  like(@Req() request: AccessRequest, @Param('id') id: string) {
    return this.texturePacks.like(request.user.profileId, id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Remove my like from a texture pack' })
  unlike(@Req() request: AccessRequest, @Param('id') id: string) {
    return this.texturePacks.unlike(request.user.profileId, id);
  }

  @Get('mine/:id/textures')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Read one page of textures from an owned pack' })
  listOwnedTextures(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Query() query: TexturePageQueryDto,
  ) {
    return this.texturePacks.listOwnedTextures(
      request.user.profileId,
      id,
      query,
    );
  }

  @Get(':id/textures')
  @ApiOperation({ summary: 'Read one page of published pack textures' })
  textures(@Param('id') id: string, @Query() query: TexturePageQueryDto) {
    return this.texturePacks.listPublicTextures(id, query);
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Create a texture pack' })
  create(@Req() request: AccessRequest, @Body() dto: CreateTexturePackDto) {
    return this.texturePacks.create(request.user.profileId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update an owned texture pack' })
  update(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTexturePackDto,
  ) {
    return this.texturePacks.update(request.user.profileId, id, dto);
  }

  @Post(':id/textures')
  @UseGuards(JwtAccessGuard)
  @UseInterceptors(
    FilesInterceptor('files', 50, { limits: { fileSize: 5_000_000 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          maxItems: 50,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload up to 50 textures into an owned pack' })
  upload(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @UploadedFiles() files?: UploadedTextureFile[],
  ) {
    return this.texturePacks.upload(request.user.profileId, id, files ?? []);
  }

  @Delete(':id/textures/:textureId')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Delete a texture from an owned pack' })
  removeOwnedTexture(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Param('textureId') textureId: string,
  ) {
    return this.texturePacks.removeOwnedTexture(
      request.user.profileId,
      id,
      textureId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Delete an owned texture pack and its textures' })
  removeOwned(@Req() request: AccessRequest, @Param('id') id: string) {
    return this.texturePacks.removeOwned(request.user.profileId, id);
  }

  @Patch(':id/publication')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Publish or unpublish an owned texture pack' })
  updatePublication(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTexturePackPublicationDto,
  ) {
    return this.texturePacks.updatePublication(
      request.user.profileId,
      id,
      dto.isPublished,
    );
  }
}
