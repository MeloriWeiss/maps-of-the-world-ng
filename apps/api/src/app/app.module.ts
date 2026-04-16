import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/api-auth';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@wm/api/users';
import { DatabaseMainModule } from '@wm/api/database-main';
import { validateEnv } from '@wm/api/api-shared';

@Module({
  imports: [
    ApiAuthModule,
    DatabaseMainModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validate: validateEnv,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
