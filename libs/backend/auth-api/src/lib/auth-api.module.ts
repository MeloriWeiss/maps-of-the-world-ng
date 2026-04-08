import { Module } from '@nestjs/common';
import { AuthService } from './services';
import { AuthController } from './controllers';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [],
})
export class AuthApiModule {}
