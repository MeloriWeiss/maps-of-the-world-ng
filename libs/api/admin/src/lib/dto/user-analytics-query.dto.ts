import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export const analyticsIntervals = [
  'hour',
  'day',
  'week',
  'month',
  'year',
] as const;
export type AnalyticsInterval = (typeof analyticsIntervals)[number];

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
