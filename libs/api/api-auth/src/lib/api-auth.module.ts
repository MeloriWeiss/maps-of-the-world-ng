import { Module } from '@nestjs/common';
import { AuthService } from './services';
import { AuthController } from './controllers';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseMainModule } from '@wm/api/database-main';
import {
  JwtAccessGuard,
  JwtAccessStrategy,
  JwtRefreshGuard,
  JwtRefreshStrategy,
  jwtStrategies,
} from './jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    DatabaseMainModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: jwtStrategies.access.name }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtAccessGuard,
    JwtRefreshGuard,
  ],
  exports: [PassportModule, JwtAccessGuard, JwtRefreshGuard],
})
export class ApiAuthModule {}
