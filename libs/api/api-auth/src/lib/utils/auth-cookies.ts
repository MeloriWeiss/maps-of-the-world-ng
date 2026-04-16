import { Response } from 'express';
import { AuthTokens } from '@wm/shared/common';
import { jwtConfig } from '../jwt';
import { isProd } from './is-prod';

export const setAuthCookies = (res: Response, tokens: AuthTokens) => {
  res.cookie(jwtConfig.accessToken.name, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: jwtConfig.accessToken.expiresIn,
    path: jwtConfig.accessToken.path,
  });

  res.cookie(jwtConfig.refreshToken.name, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: jwtConfig.refreshToken.expiresIn,
    path: jwtConfig.refreshToken.path,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(jwtConfig.accessToken.name, {
    path: jwtConfig.accessToken.path,
  });
  res.clearCookie(jwtConfig.refreshToken.name, {
    path: jwtConfig.refreshToken.path,
  });
};
