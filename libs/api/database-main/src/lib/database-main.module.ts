import { Module } from '@nestjs/common';
import { PrismaMainService } from './services';

@Module({
  imports: [],
  controllers: [],
  providers: [PrismaMainService],
  exports: [PrismaMainService],
})
export class DatabaseMainModule {}
