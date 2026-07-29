import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  TexturePackCatalogPageComponent,
  TexturePacksPageComponent,
} from '@wm/web/texture-packs';

@Component({
  selector: 'wm-profile-page-texture-packs',
  imports: [TexturePackCatalogPageComponent, TexturePacksPageComponent],
  templateUrl: './profile-page-texture-packs.component.html',
  styleUrl: './profile-page-texture-packs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageTexturePacksComponent {
  #route = inject(ActivatedRoute);
  profileId = this.#route.parent?.parent?.snapshot.paramMap.get('id') ?? 'me';
  isOwnProfile = this.profileId === 'me';
  authorUserId = this.isOwnProfile ? undefined : Number(this.profileId);
}
