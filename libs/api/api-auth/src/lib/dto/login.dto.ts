import { IsDefined, IsString, MaxLength, Matches } from 'class-validator';
import { authConfig } from '@wm/shared/auth';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsDefined({ message: authConfig.email.required.message })
  @IsString()
  @Matches(authConfig.email.correct.pattern, {
    message: authConfig.email.correct.message,
  })
  @MaxLength(authConfig.email.maxLength.value, {
    message: authConfig.email.maxLength.message,
  })
  email!: string;

  @ApiProperty()
  @IsDefined({ message: authConfig.password.required.message })
  @IsString()
  @MaxLength(authConfig.password.maxLength.value, {
    message: authConfig.password.maxLength.message,
  })
  password!: string;
}
