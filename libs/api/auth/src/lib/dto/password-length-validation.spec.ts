import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

describe('password length validation', () => {
  const longPassword = `A${'a'.repeat(63)}`;

  it('accepts an existing long password during login', async () => {
    const dto = new LoginDto();
    dto.email = 'admin@example.com';
    dto.password = longPassword;

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects a long password during registration', async () => {
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.username = 'user';
    dto.password = longPassword;

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});
