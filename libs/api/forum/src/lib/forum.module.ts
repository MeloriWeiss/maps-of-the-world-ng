import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule],
  controllers: [ForumController],
  providers: [ForumService],
})
export class ForumModule {}
