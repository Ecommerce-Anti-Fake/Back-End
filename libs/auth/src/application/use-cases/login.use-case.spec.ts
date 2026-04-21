import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserIdentityPort } from '@contracts';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence/auth-session.repository';
import { PasswordHasherService } from '../services/password-hasher.service';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  const userIdentityPortMock = {
    findByIdentifier: jest.fn(),
  };

  const authSessionRepositoryMock = {
    create: jest.fn(),
    update: jest.fn(),
  };

  const passwordHasherServiceMock = {
    verifyPassword: jest.fn(),
    hashOpaqueToken: jest.fn(),
  };

  const jwtTokenAdapterMock = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    calculateRefreshExpiry: jest.fn(),
    generateTokenId: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: UserIdentityPort, useValue: userIdentityPortMock },
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        { provide: JwtTokenAdapter, useValue: jwtTokenAdapterMock },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
  });

  it('should reject inactive accounts', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      password: 'stored-hash',
      role: 'user',
      accountStatus: 'blocked',
    });

    await expect(
      useCase.execute({ username: 'user@example.com', password: '12345678' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject invalid credentials', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ username: 'user@example.com', password: '12345678' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return access token, refresh token, and safe user payload', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      password: 'stored-password-hash',
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    passwordHasherServiceMock.verifyPassword.mockResolvedValueOnce(true);
    authSessionRepositoryMock.create.mockResolvedValueOnce({ id: 'session-1' });
    authSessionRepositoryMock.update.mockResolvedValue({});
    jwtTokenAdapterMock.generateAccessToken.mockResolvedValueOnce('access-token');
    jwtTokenAdapterMock.generateTokenId
      .mockReturnValueOnce('refresh-token-id')
      .mockReturnValueOnce('token-family-id');
    jwtTokenAdapterMock.calculateRefreshExpiry.mockReturnValueOnce(new Date(Date.now() + 60_000));
    jwtTokenAdapterMock.generateRefreshToken.mockResolvedValueOnce('refresh-token');
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce('hashed-refresh-token');

    const result = await useCase.execute({
      username: 'USER@example.com',
      password: '12345678',
    });

    expect(authSessionRepositoryMock.create).toHaveBeenCalled();
    expect(authSessionRepositoryMock.update).toHaveBeenCalledWith('session-1', {
      currentTokenHash: 'hashed-refresh-token',
    });
    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
        accountStatus: 'active',
      },
    });
  });
});
