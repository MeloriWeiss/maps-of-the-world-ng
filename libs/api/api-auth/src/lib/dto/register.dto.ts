import {
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { authConfig } from '@wm/shared/auth';

export class RegisterDto {
  @IsDefined({ message: authConfig.email.required.message })
  @IsString()
  @Matches(authConfig.email.correct.pattern, {
    message: authConfig.email.correct.message,
  })
  @MaxLength(authConfig.email.maxLength.value, {
    message: authConfig.email.maxLength.message,
  })
  email!: string;

  @IsDefined({ message: authConfig.username.required.message })
  @IsString()
  @MinLength(authConfig.username.minLength.value, {
    message: authConfig.username.minLength.message,
  })
  @MaxLength(authConfig.username.maxLength.value, {
    message: authConfig.username.maxLength.message,
  })
  username!: string;

  @IsDefined({ message: authConfig.password.required.message })
  @IsString()
  @Matches(authConfig.password.hasUppercase.pattern, {
    message: authConfig.password.hasUppercase.message,
  })
  @MinLength(authConfig.password.minLength.value, {
    message: authConfig.password.minLength.message,
  })
  @MaxLength(authConfig.password.maxLength.value, {
    message: authConfig.password.maxLength.message,
  })
  password!: string;
}
