import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key];
  }),
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockPrisma as any,
      mockJwtService as any,
      mockConfigService as any,
      mockRedis as any,
    );
    mockJwtService.signAsync
      .mockResolvedValueOnce('mock-access-token')
      .mockResolvedValueOnce('mock-refresh-token');
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'STUDENT',
        passwordHash: 'hashed-pw',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'refresh:user-1',
        'mock-refresh-token',
        604800,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'Password123!',
          displayName: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent SUPER_ADMIN registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'admin@example.com',
          password: 'Password123!',
          displayName: 'Admin',
          role: 'SUPER_ADMIN' as any,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const hashedPw = await bcrypt.hash('Password123!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        role: 'STUDENT',
        passwordHash: hashedPw,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens.accessToken).toBe('mock-access-token');
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('correct-pw', 12),
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should generate new tokens when refresh token is valid', async () => {
      mockRedis.get.mockResolvedValue('valid-refresh-token');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'STUDENT',
      });

      const result = await service.refreshTokens('user-1', 'valid-refresh-token');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockRedis.get.mockResolvedValue('stored-token');

      await expect(
        service.refreshTokens('user-1', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      await service.logout('user-1');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-1');
    });
  });
});
