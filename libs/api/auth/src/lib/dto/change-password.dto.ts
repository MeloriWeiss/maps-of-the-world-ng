import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { authConfig } from '@wm/shared/auth';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Введите текущий пароль' })
  currentPassword!: string;

  @ApiProperty()
  @IsDefined({ message: authConfig.password.required.message })
  @IsString()
  @MinLength(authConfig.password.minLength.value, {
    message: authConfig.password.minLength.message,
  })
  @MaxLength(authConfig.password.maxLength.value, {
    message: authConfig.password.maxLength.message,
  })
  @Matches(authConfig.password.hasUppercase.pattern, {
    message: authConfig.password.hasUppercase.message,
  })
  newPassword!: string;
}
