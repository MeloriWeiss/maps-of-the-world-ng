import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessRequest } from '../interfaces';
import { UserRoleType } from '@wm/shared/users';
import { REQUIRED_ROLES } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRoleType[]>(
      REQUIRED_ROLES,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length) return true;

    const request = context.switchToHttp().getRequest<AccessRequest>();

    return roles.includes(request.user.role);
  }
}
