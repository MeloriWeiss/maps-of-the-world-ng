import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModeCardComponent, SvgComponent } from '@wm/common-ui';
import { ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { MockService } from '@wm/data-access/mock/mock.service';
import { Mode } from '@wm/data-access/mods';
import { Observable } from 'rxjs';

@Component({
  selector: 'wm-profile-page',
  imports: [ReactiveFormsModule, SvgComponent, ModeCardComponent, AsyncPipe],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  #mockService = inject(MockService);

  mods$: Observable<Mode[]> = this.#mockService.getModsData();
}
