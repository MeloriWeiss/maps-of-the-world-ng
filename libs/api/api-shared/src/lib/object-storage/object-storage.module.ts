import { Module } from '@nestjs/common';
import { OBJECT_STORAGE } from './object-storage.interface';
import { S3ObjectStorageService } from './s3-object-storage.service';

@Module({
  providers: [
    S3ObjectStorageService,
    {
      provide: OBJECT_STORAGE,
      useExisting: S3ObjectStorageService,
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class ObjectStorageModule {}
