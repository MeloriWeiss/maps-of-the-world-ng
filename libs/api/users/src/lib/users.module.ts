import { Module } from '@nestjs/common';
import { UsersController } from './controllers';
import { UsersService } from './services';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ApiAuthModule } from '@wm/api/api-auth';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [],
})
export class UsersModule {}
