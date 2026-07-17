import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserIdentityPort } from '@contracts';
import { AuthSessionRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';
import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;

  const userIdentityPortMock = {
    findById: jest.fn(),
    updatePassword: jest.fn(),
  };
  const authSessionRepositoryMock = {
    revokeActiveSessionsForUser: jest.fn(),
  };
  const passwordHasherServiceMock = {
    verifyPassword: jest.fn(),
    hashPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordUseCase,
        { provide: UserIdentityPort, useValue: userIdentityPortMock },
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
      ],
    }).compile();

    useCase = module.get<ChangePasswordUseCase>(ChangePasswordUseCase);
  });

  it('requires the current password before updating password', async () => {
    userIdentityPortMock.findById.mockResolvedValueOnce(createUserRecord());
    passwordHasherServiceMock.verifyPassword.mockResolvedValueOnce(true);
    passwordHasherServiceMock.hashPassword.mockResolvedValueOnce('new-password-hash');

    const result = await useCase.execute('user-1', {
      currentPassword: 'OldStrongPass123',
      newPassword: 'NewStrongPass123',
    });

    expect(passwordHasherServiceMock.verifyPassword).toHaveBeenCalledWith('OldStrongPass123', 'stored-password-hash');
    expect(userIdentityPortMock.updatePassword).toHaveBeenCalledWith('user-1', 'new-password-hash');
    expect(authSessionRepositoryMock.revokeActiveSessionsForUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ message: 'Cập nhật mật khẩu thành công.' });
  });

  it('rejects an invalid current password', async () => {
    userIdentityPortMock.findById.mockResolvedValueOnce(createUserRecord());
    passwordHasherServiceMock.verifyPassword.mockResolvedValueOnce(false);

    await expect(
      useCase.execute('user-1', {
        currentPassword: 'wrong-password',
        newPassword: 'NewStrongPass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(userIdentityPortMock.updatePassword).not.toHaveBeenCalled();
  });
});

function createUserRecord() {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: null,
    displayName: 'User',
    role: 'user',
    accountStatus: 'active',
    password: 'stored-password-hash',
  };
}
