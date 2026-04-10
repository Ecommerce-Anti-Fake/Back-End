import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { GetCurrentUserProfileUseCase } from './get-current-user-profile.use-case';

describe('GetCurrentUserProfileUseCase', () => {
  let useCase: GetCurrentUserProfileUseCase;

  const usersRepositoryMock = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrentUserProfileUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetCurrentUserProfileUseCase>(GetCurrentUserProfileUseCase);
  });

  it('should reject when the user does not exist', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce(null);

    await expect(useCase.execute('missing-user')).rejects.toThrow(UnauthorizedException);
  });

  it('should reject when the user is not active', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      role: 'user',
      accountStatus: 'blocked',
    });

    await expect(useCase.execute('user-1')).rejects.toThrow(ForbiddenException);
  });

  it('should return a safe user payload', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      password: 'hashed-password',
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute('user-1');

    expect(result).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
      accountStatus: 'active',
    });
    expect(result).not.toHaveProperty('password');
  });
});
