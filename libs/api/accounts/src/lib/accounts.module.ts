import { Module } from '@nestjs/common';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ApiAuthModule } from '@wm/api/api-auth';
import { ObjectStorageModule } from '@wm/api/api-shared';
import { AccountsController } from './controllers';
import { AccountsService, AvatarsService } from './service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule, ObjectStorageModule],
  controllers: [AccountsController],
  providers: [AccountsService, AvatarsService],
})
export class AccountsModule {}
