import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtStrategies } from '../consts';

@Injectable()
export class JwtRefreshGuard extends AuthGuard(jwtStrategies.refresh.name) {}
