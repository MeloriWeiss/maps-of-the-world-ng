import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/api-auth';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@wm/api/users';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ApiLogger, validateEnv } from '@wm/api/api-shared';
import { AccountsModule } from '@wm/api/accounts';
import { MapsModule } from '@wm/api/maps';
import { TexturesModule } from '@wm/api/textures';

@Module({
  imports: [
    ApiAuthModule,
    DatabaseMainModule,
    UsersModule,
    AccountsModule,
    MapsModule,
    TexturesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validate: validateEnv,
    }),
  ],
  controllers: [],
  providers: [ApiLogger],
})
export class AppModule {}
