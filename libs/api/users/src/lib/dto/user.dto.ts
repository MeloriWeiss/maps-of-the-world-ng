import { ApiProperty } from '@nestjs/swagger';

/** Описывает публичные поля пользователя в ответах API. */
export class UserDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  username!: string;
}
