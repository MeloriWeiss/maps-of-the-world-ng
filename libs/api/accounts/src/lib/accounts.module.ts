import { Module } from '@nestjs/common';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ApiAuthModule } from '@wm/api/api-auth';
import { AccountsController } from './controllers';
import { AccountsService } from './service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
