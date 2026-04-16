import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../services';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LoginDto, RegisterDto } from '../dto';
import { clearAuthCookies, getUserMeta, setAuthCookies } from '../utils';
import { GetSessionsDto } from '@wm/shared/auth';
import { JwtAccessGuard, JwtRefreshGuard } from '../jwt';
import { AccessRequest, RefreshRequest } from '../interfaces';
import { DefaultResponseDto } from '@wm/shared/common';
import { UserResponseDto } from '@wm/shared/users';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create new user' })
  @ApiCreatedResponse({
    description: 'User created',
  })
  @ApiConflictResponse({
    description: 'User with such email already exists',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = getUserMeta(req);

    const { user, accessToken, refreshToken } = await this.authService.register(
      dto,
      meta,
    );

    setAuthCookies(res, { accessToken, refreshToken });

    const result: UserResponseDto = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiOkResponse({
    description: 'User successfully authenticated',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = getUserMeta(req);

    const { user, accessToken, refreshToken } = await this.authService.login(
      dto,
      meta,
    );

    setAuthCookies(res, { accessToken, refreshToken });

    const result: UserResponseDto = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    return result;
  }

  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout from account' })
  @ApiOkResponse({
    description: 'User logged out; refresh/cookie invalidated',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized to perform logout (no valid session or tokens)',
  })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: RefreshRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, sessionId } = req.user;

    await this.authService.logoutSession(userId, sessionId);

    clearAuthCookies(res);

    const result: DefaultResponseDto = {
      error: false,
      message: 'Successfully logout',
    };

    return result;
  }

  @UseGuards(JwtAccessGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: AccessRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId } = req.user;

    await this.authService.logoutAllSessions(userId);

    clearAuthCookies(res);

    const result: DefaultResponseDto = {
      error: false,
      message: 'Successfully logout all',
    };

    return result;
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({
    description: 'New access token issued',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RefreshRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, sessionId } = req.user;
    const meta = getUserMeta(req);

    const { accessToken, refreshToken } =
      await this.authService.rotateSessionAndTokens(userId, sessionId, meta);

    setAuthCookies(res, { accessToken, refreshToken });

    const result: DefaultResponseDto = {
      error: false,
      message: 'Successfully refresh',
    };

    return result;
  }

  @UseGuards(JwtAccessGuard)
  @Get('sessions')
  async getSessions(@Req() req: AccessRequest) {
    const { userId } = req.user;

    const sessions: GetSessionsDto = await this.authService.getSessions(userId);

    return sessions;
  }
}
