import { IsBoolean } from 'class-validator';

export class UpdateContentVisibilityDto {
  @IsBoolean()
  isHidden!: boolean;
}
