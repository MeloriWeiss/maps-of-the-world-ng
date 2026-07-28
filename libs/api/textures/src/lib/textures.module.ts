import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/api-auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { TexturesController } from './textures.controller';
import { TexturesService } from './textures.service';
import { TextureStorageService } from './texture-storage.service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule],
  controllers: [TexturesController],
  providers: [TexturesService, TextureStorageService],
})
export class TexturesModule {}
