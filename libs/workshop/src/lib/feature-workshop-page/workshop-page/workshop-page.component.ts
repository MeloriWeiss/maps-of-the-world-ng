import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FantasyMapComponent } from './fantasy-map/fantasy-map.component';

@Component({
  selector: 'wm-workshop-page',
  imports: [FantasyMapComponent],
  templateUrl: './workshop-page.component.html',
  styleUrl: './workshop-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopPageComponent {}
