import {
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { authConfig } from '@wm/shared/auth';

export class LoginDto {
  @IsDefined({ message: authConfig.email.required.message })
  @IsString()
  @Matches(authConfig.email.correct.pattern, {
    message: authConfig.email.correct.message,
  })
  @MaxLength(authConfig.email.maxLength.value, {
    message: authConfig.email.maxLength.message,
  })
  email!: string;

  @IsDefined({ message: authConfig.password.required.message })
  @IsString()
  @MinLength(authConfig.password.minLength.value, {
    message: authConfig.password.minLength.message,
  })
  @Matches(authConfig.password.hasUppercase.pattern, {
    message: authConfig.password.hasUppercase.message,
  })
  @MaxLength(authConfig.password.maxLength.value, {
    message: authConfig.password.maxLength.message,
  })
  password!: string;
}
