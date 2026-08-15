import { Request } from 'express';

export const extractFromCookie = (cookieName: string) => {
  return (req: Request): string | null => {
    return req.cookies?.[cookieName] ?? null;
  };
};
