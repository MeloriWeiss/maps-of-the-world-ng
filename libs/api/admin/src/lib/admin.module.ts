import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SiteVisitsController } from './site-visits.controller';
import { ObjectStorageModule } from '@wm/api/shared';
import { AdminSystemStatusService } from './admin-system-status.service';

@Module({
  imports: [ApiAuthModule, DatabaseMainModule, ObjectStorageModule],
  controllers: [AdminController, SiteVisitsController],
  providers: [AdminService, AdminSystemStatusService],
})
export class AdminModule {}
