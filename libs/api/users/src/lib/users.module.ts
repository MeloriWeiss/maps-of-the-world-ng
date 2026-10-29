import { Module } from '@nestjs/common';
import { UsersController } from './controllers';
import { UsersService } from './services';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ApiAuthModule } from '@wm/api/auth';

/** Подключает контроллер и сервис API пользователей. */
@Module({
  imports: [DatabaseMainModule, ApiAuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [],
})
export class UsersModule {}
