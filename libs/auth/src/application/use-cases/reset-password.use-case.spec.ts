import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserIdentityPort } from '@contracts';
import { AuthSessionRepository, PasswordResetTokenRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;

  const userIdentityPortMock = {
    updatePassword: jest.fn(),
  };
  const passwordResetTokenRepositoryMock = {
    findById: jest.fn(),
    markUsed: jest.fn(),
  };
  const authSessionRepositoryMock = {
    revokeActiveSessionsForUser: jest.fn(),
  };
  const passwordHasherServiceMock = {
    verifyHashedValue: jest.fn(),
    hashPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
        { provide: UserIdentityPort, useValue: userIdentityPortMock },
        { provide: PasswordResetTokenRepository, useValue: passwordResetTokenRepositoryMock },
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
      ],
    }).compile();

    useCase = module.get<ResetPasswordUseCase>(ResetPasswordUseCase);
  });

  it('updates password, marks reset token used, and revokes sessions', async () => {
    passwordResetTokenRepositoryMock.findById.mockResolvedValueOnce(createResetTokenRecord());
    passwordHasherServiceMock.verifyHashedValue.mockReturnValueOnce(true);
    passwordHasherServiceMock.hashPassword.mockResolvedValueOnce('new-password-hash');

    const result = await useCase.execute({
      token: 'reset-token-1.raw-secret',
      newPassword: 'NewStrongPass123',
    });

    expect(userIdentityPortMock.updatePassword).toHaveBeenCalledWith('user-1', 'new-password-hash');
    expect(passwordResetTokenRepositoryMock.markUsed).toHaveBeenCalledWith('reset-token-1');
    expect(authSessionRepositoryMock.revokeActiveSessionsForUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ message: 'Cập nhật mật khẩu thành công.' });
  });

  it('rejects used reset tokens', async () => {
    passwordResetTokenRepositoryMock.findById.mockResolvedValueOnce(createResetTokenRecord({ usedAt: new Date() }));

    await expect(
      useCase.execute({
        token: 'reset-token-1.raw-secret',
        newPassword: 'NewStrongPass123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userIdentityPortMock.updatePassword).not.toHaveBeenCalled();
  });
});

function createResetTokenRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reset-token-1',
    userId: 'user-1',
    tokenHash: 'stored-reset-hash',
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    user: {
      id: 'user-1',
    },
    ...overrides,
  };
}
