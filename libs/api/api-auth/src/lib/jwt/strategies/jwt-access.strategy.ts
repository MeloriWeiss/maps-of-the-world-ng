import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { jwtConfig, jwtStrategies } from '../consts';
import { extractFromCookie } from '../../utils';
import { AccessPayload, JwtTokenPayload } from '../../interfaces';
import { Request } from 'express';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  jwtStrategies.access.name,
) {
  constructor(private readonly config: ConfigService) {
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

    return { userId: payload.sub };
  }
}
