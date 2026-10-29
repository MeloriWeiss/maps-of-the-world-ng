import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

/** Поддерживаемые интервалы группировки административной статистики. */
export const analyticsIntervals = [
  'hour',
  'day',
  'week',
  'month',
  'year',
] as const;
/** Тип интервала группировки статистики. */
export type AnalyticsInterval = (typeof analyticsIntervals)[number];

/** Проверяет период и интервал группировки пользовательской статистики. */
export class UserAnalyticsQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: analyticsIntervals, default: 'day' })
  @IsOptional()
  @IsIn(analyticsIntervals)
  interval: AnalyticsInterval = 'day';
}
