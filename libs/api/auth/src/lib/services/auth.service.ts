import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaMainService } from '@wm/api/database-main';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto';
import { JwtTokenPayload, UserMeta } from '../interfaces';
import { jwtConfig } from '../jwt';
import { UserStatus } from '@wm/shared/users';
import { randomUUID } from 'node:crypto';
import { refreshTokenDigest } from '../utils/refresh-token-hash';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaMainService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, meta?: UserMeta) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser)
      throw new ConflictException('Пользователь с такой почтой уже существует');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        personalAccount: {
          create: {
            nickname: dto.email.split('@')[0],
          },
        },
      },
      include: {
        personalAccount: true,
      },
    });

    const { accessToken, refreshToken } =
      await this.createSessionAndIssueTokens(
        user.id,
        user.personalAccount!.id,
        meta,
        user.passwordHash,
      );

    return { user, accessToken, refreshToken };
  }

  async login(dto: { email: string; password: string }, meta?: UserMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        personalAccount: true,
      },
    });

    if (!user) throw new UnauthorizedException('Введены неверные данные');

    if (user.status === UserStatus.blocked)
      throw new UnauthorizedException('Аккаунт заблокирован');

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Введены неверные данные');

    await this.prisma.userSession.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    if (!user.personalAccount) {
      user.personalAccount = await this.prisma.personalAccount.create({
        data: {
          userId: user.id,
          nickname: user.email.split('@')[0],
        },
      });
    }

    const { accessToken, refreshToken } =
      await this.createSessionAndIssueTokens(
        user.id,
        user.personalAccount.id,
        meta,
        user.passwordHash,
      );

    return { user, accessToken, refreshToken };
  }

  async logoutSession(userId: number, sessionId: number) {
    await this.prisma.userSession.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async logoutAllSessions(userId: number) {
    await this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  async getSessions(userId: number, currentSessionId?: number) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        isCurrent: s.id === currentSessionId,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      })),
    };
  }

  async createSessionAndIssueTokens(
    userId: number,
    accountId: number,
    meta?: UserMeta,
    expectedPasswordHash?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize login with password changes, so an in-flight old-password
      // login cannot create a session after all other sessions were revoked.
      if (expectedPasswordHash) {
        const user = await tx.user.updateMany({
          where: {
            id: userId,
            passwordHash: expectedPasswordHash,
            status: UserStatus.active,
          },
          data: { passwordHash: expectedPasswordHash },
        });
        if (user.count !== 1)
          throw new UnauthorizedException('Please sign in again');
      }
      const session = await tx.userSession.create({
        data: {
          userId,
          tokenHash: '',
          userAgent: meta?.userAgent,
          ip: meta?.ip,
          expiresAt: new Date(Date.now() + jwtConfig.refreshToken.expiresIn),
        },
      });
      const tokens = await this.signTokens(userId, accountId, session.id);
      await tx.userSession.update({
        where: { id: session.id },
        data: {
          tokenHash: await bcrypt.hash(
            refreshTokenDigest(tokens.refreshToken),
            10,
          ),
        },
      });
      return tokens;
    });
  }

  async changePassword(
    userId: number,
    sessionId: number,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    )
      throw new BadRequestException('Текущий пароль указан неверно');
    if (await bcrypt.compare(dto.newPassword, user.passwordHash))
      throw new BadRequestException(
        'Новый пароль должен отличаться от текущего',
      );

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: {
          id: userId,
          passwordHash: user.passwordHash,
          status: UserStatus.active,
        },
        data: { passwordHash },
      });
      if (changed.count !== 1)
        throw new BadRequestException(
          'Данные аккаунта изменились. Повторите попытку',
        );
      const session = await tx.userSession.findFirst({
        where: { id: sessionId, userId, expiresAt: { gt: new Date() } },
      });
      if (!session) throw new UnauthorizedException('Session ended');
      await tx.userSession.deleteMany({
        where: { userId, id: { not: sessionId } },
      });
    });
  }

  async rotateSessionAndTokens(
    userId: number,
    accountId: number,
    sessionId: number,
    meta?: UserMeta,
  ) {
    const { accessToken, refreshToken } = await this.signTokens(
      userId,
      accountId,
      sessionId,
    );

    const tokenHash = await bcrypt.hash(refreshTokenDigest(refreshToken), 10);
    const now = Date.now();
    const expiresAt = new Date(now + jwtConfig.refreshToken.expiresIn);

    const resultMeta = meta ? meta : {};

    const updated = await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, expiresAt: { gt: new Date() } },
      data: {
        tokenHash,
        userAgent: resultMeta.userAgent,
        ip: resultMeta.ip,
        lastUsedAt: new Date(now),
        expiresAt,
      },
    });

    if (updated.count !== 1) throw new UnauthorizedException('Session ended');
    return { accessToken, refreshToken };
  }

  async signTokens(userId: number, accountId: number, sessionId?: number) {
    const payload: JwtTokenPayload = { sub: userId, accountId, sid: sessionId };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '900s'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      jwtid: randomUUID(),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '30d'),
    });

    return { accessToken, refreshToken };
  }
}
