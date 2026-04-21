import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence/auth-session.repository';
import { PasswordHasherService } from '../services/password-hasher.service';
import { LogoutUseCase } from './logout.use-case';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  const authSessionRepositoryMock = {
    findSessionOnlyById: jest.fn(),
    update: jest.fn(),
  };

  const passwordHasherServiceMock = {
    verifyHashedValue: jest.fn(),
  };

  const jwtTokenAdapterMock = {
    verifyRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        { provide: JwtTokenAdapter, useValue: jwtTokenAdapterMock },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
  });

  it('should return loggedOut when the session does not exist', async () => {
    jwtTokenAdapterMock.verifyRefreshToken.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    authSessionRepositoryMock.findSessionOnlyById.mockResolvedValueOnce(null);

    await expect(useCase.execute({ refreshToken: 'refresh-token' })).resolves.toEqual({
      loggedOut: true,
    });
  });

  it('should revoke the current session for a valid refresh token', async () => {
    jwtTokenAdapterMock.verifyRefreshToken.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    authSessionRepositoryMock.findSessionOnlyById.mockResolvedValueOnce({
      id: 'session-1',
      currentTokenId: 'token-1',
      currentTokenHash: 'hashed-refresh-token',
      revokedAt: null,
    });
    passwordHasherServiceMock.verifyHashedValue.mockReturnValueOnce(true);
    authSessionRepositoryMock.update.mockResolvedValue({});

    await expect(useCase.execute({ refreshToken: 'refresh-token' })).resolves.toEqual({
      loggedOut: true,
    });
    expect(authSessionRepositoryMock.update).toHaveBeenCalledWith('session-1', {
      revokedAt: expect.any(Date),
    });
  });

  it('should reject refresh token reuse', async () => {
    jwtTokenAdapterMock.verifyRefreshToken.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    authSessionRepositoryMock.findSessionOnlyById.mockResolvedValueOnce({
      id: 'session-1',
      currentTokenId: 'token-2',
      currentTokenHash: 'hashed-refresh-token',
      revokedAt: null,
    });
    passwordHasherServiceMock.verifyHashedValue.mockReturnValueOnce(false);
    authSessionRepositoryMock.update.mockResolvedValue({});

    await expect(useCase.execute({ refreshToken: 'refresh-token' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authSessionRepositoryMock.update).toHaveBeenCalledWith('session-1', {
      revokedAt: expect.any(Date),
      reuseDetectedAt: expect.any(Date),
    });
  });
});
