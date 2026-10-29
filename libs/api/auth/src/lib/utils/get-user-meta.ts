import { Request } from 'express';
import { UserMeta } from '../interfaces';

/** Возвращает метаданные текущего пользователя из контекста запроса. */
export const getUserMeta = (req: Request): UserMeta => {
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };
};
