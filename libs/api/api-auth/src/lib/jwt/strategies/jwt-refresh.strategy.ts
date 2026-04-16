import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaMainService } from '@wm/api/database-main';
import * as bcrypt from 'bcrypt';
import { jwtConfig, jwtStrategies } from '../consts';
import { extractFromCookie } from '../../utils';
import { JwtTokenPayload, RefreshPayload } from '../../interfaces';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  jwtStrategies.refresh.name,
) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaMainService,
  ) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');

    if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie(jwtConfig.refreshToken.name),
      ]),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtTokenPayload,
  ): Promise<RefreshPayload> {
    const refreshToken = extractFromCookie(jwtConfig.refreshToken.name)(req);

    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const sessions = await this.prisma.userSession.findMany({
      where: { userId: payload.sub },
    });

    if (!sessions.length)
      throw new UnauthorizedException('No active refresh tokens');

    const checks = await Promise.all(
      sessions.map(async (s) => ({
        token: s,
        ok: await bcrypt.compare(refreshToken, s.tokenHash),
      })),
    );

    const match = checks.find((c) => c.ok)?.token ?? null;

    if (!match) throw new UnauthorizedException('Invalid refresh token');

    if (match.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return { userId: payload.sub, sessionId: match.id };
  }
}
