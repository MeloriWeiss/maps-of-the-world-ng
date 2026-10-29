import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { ObjectStorageModule } from '@wm/api/shared';
import { TexturesController } from './textures.controller';
import { TexturesService } from './textures.service';
import { TexturePacksController } from './texture-packs.controller';
import { TexturePacksService } from './texture-packs.service';
import { TextureBlobCleanupService } from './texture-blob-cleanup.service';

/** Подключает контроллер и сервис для работы с файлами текстур. */
@Module({
  imports: [DatabaseMainModule, ApiAuthModule, ObjectStorageModule],
  controllers: [TexturesController, TexturePacksController],
  providers: [TexturesService, TexturePacksService, TextureBlobCleanupService],
})
export class TexturesModule {}
