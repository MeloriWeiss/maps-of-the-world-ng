import { Request } from 'express';

/** Извлекает значение cookie из заголовка запроса. */
export const extractFromCookie = (cookieName: string) => {
  return (req: Request): string | null => {
    return req.cookies?.[cookieName] ?? null;
  };
};
