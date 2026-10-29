import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
/** Предоставляет HTTP-проверку доступности API. */
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API liveness' })
  @ApiOkResponse({
    description: 'API process is running',
    schema: { example: { status: 'ok' } },
  })
  getHealth() {
    return { status: 'ok' };
  }
}
