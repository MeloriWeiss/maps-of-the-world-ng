import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Проверяет данные, необходимые для регистрации посещения. */
export class RecordSiteVisitDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  visitorId!: string;
}
