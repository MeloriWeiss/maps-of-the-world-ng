import { Module } from '@nestjs/common';
import { PrismaMainService } from './services';

/** Предоставляет основное подключение к базе данных приложения. */
@Module({
  imports: [],
  controllers: [],
  providers: [PrismaMainService],
  exports: [PrismaMainService],
})
export class DatabaseMainModule {}
