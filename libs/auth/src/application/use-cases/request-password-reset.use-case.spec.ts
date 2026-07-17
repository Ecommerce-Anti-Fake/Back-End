import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserIdentityPort } from '@contracts';
import { PasswordResetTokenRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';

describe('RequestPasswordResetUseCase', () => {
  let useCase: RequestPasswordResetUseCase;

  const userIdentityPortMock = {
    findByIdentifier: jest.fn(),
  };
  const passwordResetTokenRepositoryMock = {
    expireOpenTokensForUser: jest.fn(),
    create: jest.fn(),
  };
  const passwordHasherServiceMock = {
    hashOpaqueToken: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    configServiceMock.get.mockImplementation((key: string) => (key === 'PASSWORD_RESET_RETURN_TOKEN' ? 'true' : undefined));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestPasswordResetUseCase,
        { provide: UserIdentityPort, useValue: userIdentityPortMock },
        { provide: PasswordResetTokenRepository, useValue: passwordResetTokenRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    useCase = module.get<RequestPasswordResetUseCase>(RequestPasswordResetUseCase);
  });

  it('creates a hashed reset token for an active account', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce(createUserRecord());
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce('hashed-reset-token');
    passwordResetTokenRepositoryMock.create.mockResolvedValueOnce({ id: 'reset-token-1' });

    const result = await useCase.execute({ identifier: 'USER@example.com' });

    expect(userIdentityPortMock.findByIdentifier).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(passwordResetTokenRepositoryMock.expireOpenTokensForUser).toHaveBeenCalledWith('user-1');
    expect(passwordResetTokenRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: 'hashed-reset-token',
        expiresAt: expect.any(Date),
      }),
    );
    expect(result.resetToken).toMatch(/^reset-token-1\./);
  });

  it('returns the same generic message when the account does not exist', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce(null);

    const result = await useCase.execute({ identifier: 'missing@example.com' });

    expect(passwordResetTokenRepositoryMock.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Nếu tài khoản tồn tại, yêu cầu đặt lại mật khẩu đã được tạo.',
    });
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
