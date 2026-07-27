import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/api-auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule],
  controllers: [MapsController],
  providers: [MapsService],
})
export class MapsModule {}
