import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/api-auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { TexturesController } from './textures.controller';
import { TexturesService } from './textures.service';
import { OBJECT_STORAGE } from './object-storage.interface';
import { S3ObjectStorageService } from './s3-object-storage.service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule],
  controllers: [TexturesController],
  providers: [
    TexturesService,
    S3ObjectStorageService,
    {
      provide: OBJECT_STORAGE,
      useExisting: S3ObjectStorageService,
    },
  ],
})
export class TexturesModule {}
