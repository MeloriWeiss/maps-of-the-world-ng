import {
  Controller,
  Get,
  Header,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { OptionalAccessRequest, OptionalJwtAccessGuard } from '@wm/api/auth';
import { TexturesService } from './textures.service';

@ApiTags('textures')
@Controller('textures')
export class TexturesController {
  constructor(private readonly textures: TexturesService) {}

  @Get(':id')
  @UseGuards(OptionalJwtAccessGuard)
  @ApiOperation({ summary: 'Read metadata of one texture' })
  metadata(@Param('id') id: string, @Req() request: OptionalAccessRequest) {
    return this.textures.getMetadata(id, request.user?.profileId);
  }

  @Get(':id/file')
  @UseGuards(OptionalJwtAccessGuard)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Read texture image by its opaque identifier' })
  async file(
    @Param('id') id: string,
    @Req() request: OptionalAccessRequest,
    @Res() response: Response,
  ) {
    const file = await this.textures.getFile(id, request.user?.profileId);
    response.type(file.mimeType).send(file.body);
  }
}
