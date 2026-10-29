import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtStrategies } from '../consts';

/** Проверяет access-токен для защищённого маршрута. */
@Injectable()
export class JwtAccessGuard extends AuthGuard(jwtStrategies.access.name) {}
