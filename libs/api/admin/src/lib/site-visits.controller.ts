import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RecordSiteVisitDto } from './dto/record-site-visit.dto';

@ApiTags('Site visits')
@Controller('site-visits')
export class SiteVisitsController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record an anonymous browser visit' })
  async record(@Body() dto: RecordSiteVisitDto) {
    await this.adminService.recordSiteVisit(dto.sessionId, dto.visitorId);
  }
}
