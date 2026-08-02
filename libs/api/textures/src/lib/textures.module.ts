import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/api-auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ObjectStorageModule } from '@wm/api/api-shared';
import { TexturesController } from './textures.controller';
import { TexturesService } from './textures.service';
import { TexturePacksController } from './texture-packs.controller';
import { TexturePacksService } from './texture-packs.service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule, ObjectStorageModule],
  controllers: [TexturesController, TexturePacksController],
  providers: [TexturesService, TexturePacksService],
})
export class TexturesModule {}
