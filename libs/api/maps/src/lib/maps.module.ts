import { Module } from '@nestjs/common';
import { ApiAuthModule } from '@wm/api/auth';
import { DatabaseMainModule } from '@wm/api/database-main';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { ObjectStorageModule } from '@wm/api/shared';
import { MapSceneService } from './map-scene.service';
import { MapSceneController } from './map-scene.controller';
import { MapSceneV4Controller } from './map-scene-v4.controller';
import { MapSceneV4Service } from './map-scene-v4.service';
import { MapSceneCommitService } from './map-scene-commit.service';
import { SceneBlobCleanupService } from './scene-blob-cleanup.service';

@Module({
  imports: [DatabaseMainModule, ApiAuthModule, ObjectStorageModule],
  controllers: [MapsController, MapSceneController, MapSceneV4Controller],
  providers: [
    MapsService,
    MapSceneService,
    MapSceneV4Service,
    MapSceneCommitService,
    SceneBlobCleanupService,
  ],
})
export class MapsModule {}
