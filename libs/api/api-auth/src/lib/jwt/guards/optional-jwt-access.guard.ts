import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { jwtConfig } from '../consts';
import { JwtAccessGuard } from './jwt-access.guard';

@Injectable()
export class OptionalJwtAccessGuard extends JwtAccessGuard {
  override canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.cookies?.[jwtConfig.accessToken.name]) return true;
    return super.canActivate(context);
  }
}
