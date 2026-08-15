import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services';

jest.mock('../jwt', () => ({
  JwtAccessGuard: class {},
  JwtRefreshGuard: class {},
  jwtConfig: {
    accessToken: {
      name: 'access_token',
      path: '/api',
      expiresIn: 15 * 60 * 1000,
    },
    refreshToken: {
      name: 'refresh_token',
      path: '/api',
      expiresIn: 30 * 24 * 60 * 60 * 1000,
    },
  },
}));

jest.mock('../utils', () => ({
  getUserMeta: jest.fn(() => ({ ip: '127.0.0.1', userAgent: 'jest' })),
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
}));

describe('AuthController (smoke)', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const authServiceMock: Partial<AuthService> = {
      register: jest.fn(),
      login: jest.fn(),
      logoutSession: jest.fn(),
      logoutAllSessions: jest.fn(),
      rotateSessionAndTokens: jest.fn(),
      getSessions: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
