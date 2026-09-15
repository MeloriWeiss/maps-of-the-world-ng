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
import { UserStatus } from '@wm/shared/users';
import { refreshTokenDigest } from '../../utils/refresh-token-hash';

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
    // Legacy hashes cannot reliably identify a device: bcrypt truncated JWTs.
    // Accepting them could let a revoked token match another surviving session.
    if (!Number.isInteger(payload.sid))
      throw new UnauthorizedException('Please sign in again');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true },
    });

    if (!user || user.status === UserStatus.blocked)
      throw new UnauthorizedException('Account is unavailable');

    const session = await this.prisma.userSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) throw new UnauthorizedException('No active refresh tokens');

    const valid = await bcrypt.compare(
      refreshTokenDigest(refreshToken),
      session.tokenHash,
    );
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    return {
      userId: payload.sub,
      accountId: payload.accountId,
      sessionId: session.id,
    };
  }
}
