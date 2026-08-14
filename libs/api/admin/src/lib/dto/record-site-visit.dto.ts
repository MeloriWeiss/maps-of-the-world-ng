import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RecordSiteVisitDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  visitorId!: string;
}
