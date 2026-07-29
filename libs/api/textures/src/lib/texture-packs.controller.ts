import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreateTexturePackDto, TexturePageQueryDto } from './texture-pack.dto';
import { UploadedTextureFile } from './texture-file.interface';
import { TexturePacksService } from './texture-packs.service';

@ApiTags('texture-packs')
@Controller('texture-packs')
@UseGuards(JwtAccessGuard)
export class TexturePacksController {
  constructor(private readonly texturePacks: TexturePacksService) {}

  @Get()
  @ApiOperation({ summary: 'List texture packs owned by the current account' })
  list(@Req() request: AccessRequest) {
    return this.texturePacks.list(request.user.profileId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read an owned texture pack' })
  get(@Req() request: AccessRequest, @Param('id') id: string) {
    return this.texturePacks.get(request.user.profileId, id);
  }

  @Get(':id/textures')
  @ApiOperation({ summary: 'Read one page of textures from an owned pack' })
  listTextures(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Query() query: TexturePageQueryDto,
  ) {
    return this.texturePacks.listTextures(request.user.profileId, id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a texture pack' })
  create(@Req() request: AccessRequest, @Body() dto: CreateTexturePackDto) {
    return this.texturePacks.create(request.user.profileId, dto);
  }

  @Post(':id/textures')
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
}
