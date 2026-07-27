import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessRequest, JwtAccessGuard } from '@wm/api/api-auth';
import { SaveMapDto } from './maps.dto';
import { MapsService } from './maps.service';

@Controller('maps')
@UseGuards(JwtAccessGuard)
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get()
  list(@Req() request: AccessRequest) {
    return this.maps.list(request.user.profileId);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @Req() request: AccessRequest) {
    return this.maps.get(id, request.user.profileId);
  }

  @Post()
  create(@Body() dto: SaveMapDto, @Req() request: AccessRequest) {
    return this.maps.create(request.user.profileId, dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveMapDto,
    @Req() request: AccessRequest,
  ) {
    return this.maps.update(id, request.user.profileId, dto);
  }
}
