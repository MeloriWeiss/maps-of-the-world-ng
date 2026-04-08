import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthApiModule } from '@wm/auth-api';

@Module({
  imports: [AuthApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
