import {
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
      throw new ConflictException('User with this email already exists');

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

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

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

  async getSessions(userId: number) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt.toString(),
        lastUsedAt: s.lastUsedAt.toString(),
        expiresAt: s.expiresAt.toString(),
      })),
    };
  }

  async createSessionAndIssueTokens(
    userId: number,
    accountId: number,
    meta?: UserMeta,
  ) {
    const { accessToken, refreshToken } = await this.signTokens(
      userId,
      accountId,
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + jwtConfig.refreshToken.expiresIn);

    const resultMeta = meta ? meta : {};

    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash,
        userAgent: resultMeta.userAgent,
        ip: resultMeta.ip,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
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
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const now = Date.now();
    const expiresAt = new Date(now + jwtConfig.refreshToken.expiresIn);

    const resultMeta = meta ? meta : {};

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        tokenHash,
        userAgent: resultMeta.userAgent,
        ip: resultMeta.ip,
        lastUsedAt: new Date(now),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async signTokens(userId: number, accountId: number) {
    const payload: JwtTokenPayload = { sub: userId, accountId: accountId };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '900s'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '30d'),
    });

    return { accessToken, refreshToken };
  }
}
