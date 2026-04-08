import { Controller, Post } from '@nestjs/common';
import { AuthService } from '../services';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  login() {
    return this.authService.login();
  }

  @Post('register')
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 201,
    description: 'User created',
  })
  @ApiResponse({
    status: 409,
    description: 'User with such email already exists',
  })
  register() {
    return this.authService.register();
  }

  @ApiOperation({ summary: 'Logout from account' })
  @ApiResponse({
    status: 200,
    description: 'User logged out; refresh/cookie invalidated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized to perform logout (no valid session or tokens)',
  })
  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'New access token issued',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  refresh() {
    return this.authService.refresh();
  }
}
