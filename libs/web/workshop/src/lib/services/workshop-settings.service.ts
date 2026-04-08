import { Injectable } from '@angular/core';
import { workshopDefaultSettings } from '../consts';

@Injectable()
export class WorkshopSettingsService {
  panningMouseButton = workshopDefaultSettings.panningMouseButton;
  drawMouseButton = workshopDefaultSettings.drawMouseButton;
}
