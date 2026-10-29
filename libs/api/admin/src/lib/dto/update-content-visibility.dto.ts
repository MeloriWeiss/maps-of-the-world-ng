import { IsBoolean } from 'class-validator';

/** Проверяет новое состояние видимости материала. */
export class UpdateContentVisibilityDto {
  @IsBoolean()
  isHidden!: boolean;
}
