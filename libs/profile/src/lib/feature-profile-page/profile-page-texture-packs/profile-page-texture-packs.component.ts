import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModeCardComponent } from '@wm/common-ui';
import { ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { MockService } from '@wm/data-access/mock/mock.service';
import { Mode } from '@wm/data-access/mods';
import { Observable } from 'rxjs';

@Component({
  selector: 'wm-profile-page-texture-packs',
  imports: [ReactiveFormsModule, ModeCardComponent, AsyncPipe],
  templateUrl: './profile-page-texture-packs.component.html',
  styleUrl: './profile-page-texture-packs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageTexturePacksComponent {
  #mockService = inject(MockService);

  mods$: Observable<Mode[]> = this.#mockService.getModsData();
}
