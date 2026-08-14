import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { jwtConfig, jwtStrategies } from '../consts';
import { extractFromCookie } from '../../utils';
import { AccessPayload, JwtTokenPayload } from '../../interfaces';
import { Request } from 'express';
import { PrismaMainService } from '@wm/api/database-main';
import { UserStatus } from '@wm/shared/users';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  jwtStrategies.access.name,
) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaMainService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');

    if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie(jwtConfig.accessToken.name),
      ]),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtTokenPayload,
  ): Promise<AccessPayload> {
    const accessToken = extractFromCookie(jwtConfig.accessToken.name)(req);

    if (!accessToken) throw new UnauthorizedException('Missing access token');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, status: true },
    });

    if (!user || user.status === UserStatus.blocked)
      throw new UnauthorizedException('Account is unavailable');

    return {
      userId: payload.sub,
      profileId: payload.accountId,
      role: user.role,
    };
  }
}
