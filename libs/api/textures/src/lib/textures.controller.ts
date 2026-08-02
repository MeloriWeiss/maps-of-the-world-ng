import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { TexturesService } from './textures.service';

@ApiTags('textures')
@Controller('textures')
export class TexturesController {
  constructor(private readonly textures: TexturesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Read metadata of one texture' })
  metadata(@Param('id') id: string) {
    return this.textures.getMetadata(id);
  }

  @Get(':id/file')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOperation({ summary: 'Read texture image by its opaque identifier' })
  async file(@Param('id') id: string, @Res() response: Response) {
    const file = await this.textures.getFile(id);
    response.type(file.mimeType).send(file.body);
  }
}
