import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessRequest, JwtAccessGuard } from '@wm/api/api-auth';
import { Response } from 'express';
import { UploadTextureDto } from './texture.dto';
import { UploadedTextureFile } from './texture-file.interface';
import { TexturesService } from './textures.service';

@ApiTags('textures')
@Controller('textures')
export class TexturesController {
  constructor(private readonly textures: TexturesService) {}

  @Get()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'List textures owned by the current account' })
  list(@Req() request: AccessRequest) {
    return this.textures.list(request.user.profileId);
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_000_000 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'file'],
      properties: {
        name: { type: 'string', maxLength: 120 },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a PNG, JPEG or WebP texture' })
  upload(
    @Req() request: AccessRequest,
    @Body() dto: UploadTextureDto,
    @UploadedFile() file?: UploadedTextureFile,
  ) {
    return this.textures.upload(request.user.profileId, dto.name, file);
  }

  @Get(':id/file')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOperation({ summary: 'Read texture image by its opaque identifier' })
  async file(@Param('id') id: string, @Res() response: Response) {
    const file = await this.textures.getFile(id);
    response.type(file.mimeType).send(file.body);
  }
}
