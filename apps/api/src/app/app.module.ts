import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/auth';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@wm/api/users';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ApiLogger, validateEnv } from '@wm/api/shared';
import { AccountsModule } from '@wm/api/accounts';
import { MapsModule } from '@wm/api/maps';
import { TexturesModule } from '@wm/api/texture-packs';
import { ForumModule } from '@wm/api/forum';
import { HealthController } from './health.controller';
import { AdminModule } from '@wm/api/admin';

@Module({
  imports: [
    ApiAuthModule,
    DatabaseMainModule,
    UsersModule,
    AccountsModule,
    MapsModule,
    TexturesModule,
    ForumModule,
    AdminModule,
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validate: validateEnv,
    }),
  ],
  controllers: [HealthController],
  providers: [ApiLogger],
})
export class AppModule {}
