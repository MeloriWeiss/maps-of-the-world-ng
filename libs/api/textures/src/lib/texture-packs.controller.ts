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
import { AccessRequest, JwtAccessGuard } from '@wm/api/api-auth';
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
  @ApiOperation({ summary: 'List published texture packs' })
  listPublished() {
    return this.texturePacks.listPublished();
  }

  @Get('authors/:userId')
  @ApiOperation({ summary: 'List published texture packs by author' })
  listByAuthor(@Param('userId') userId: string) {
    return this.texturePacks.listPublished(Number(userId));
  }

  @Get('published/:id')
  @ApiOperation({ summary: 'Read a published texture pack' })
  getPublished(@Param('id') id: string) {
    return this.texturePacks.getPublished(id);
  }

  @Get('published/:id/textures')
  @ApiOperation({ summary: 'Read one page of published pack textures' })
  listPublishedTextures(
    @Param('id') id: string,
    @Query() query: TexturePageQueryDto,
  ) {
    return this.texturePacks.listPublishedTextures(id, query);
  }

  @Get('mine')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'List texture packs owned by the current account' })
  listMine(@Req() request: AccessRequest) {
    return this.texturePacks.listMine(request.user.profileId);
  }

  @Get(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Read an owned texture pack' })
  get(@Req() request: AccessRequest, @Param('id') id: string) {
    return this.texturePacks.get(request.user.profileId, id);
  }

  @Get(':id/textures')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Read one page of textures from an owned pack' })
  listTextures(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Query() query: TexturePageQueryDto,
  ) {
    return this.texturePacks.listTextures(request.user.profileId, id, query);
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
  removeTexture(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Param('textureId') textureId: string,
  ) {
    return this.texturePacks.removeTexture(
      request.user.profileId,
      id,
      textureId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Delete an owned texture pack and its textures' })
  remove(@Req() request: AccessRequest, @Param('id') id: string) {
    return this.texturePacks.remove(request.user.profileId, id);
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
