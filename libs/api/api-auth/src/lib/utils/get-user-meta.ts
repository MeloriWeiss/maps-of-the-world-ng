import { Request } from 'express';
import { UserMeta } from '../interfaces';

export const getUserMeta = (req: Request): UserMeta => {
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };
};
