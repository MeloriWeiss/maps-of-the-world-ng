import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtStrategies } from '../consts';

/** Проверяет refresh-токен для обновления сеанса. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard(jwtStrategies.refresh.name) {}
