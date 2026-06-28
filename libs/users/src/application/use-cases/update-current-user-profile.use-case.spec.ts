import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UpdateCurrentUserProfileUseCase } from './update-current-user-profile.use-case';

describe('UpdateCurrentUserProfileUseCase', () => {
  let useCase: UpdateCurrentUserProfileUseCase;

  const usersRepositoryMock = {
    findById: jest.fn(),
    findUserByEmailOrPhone: jest.fn(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateCurrentUserProfileUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<UpdateCurrentUserProfileUseCase>(UpdateCurrentUserProfileUseCase);
  });

  it('updates displayName and phone for the current user', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce(createUser());
    usersRepositoryMock.findUserByEmailOrPhone.mockResolvedValueOnce(null);
    usersRepositoryMock.updateUser.mockResolvedValueOnce(createUser());

    const result = await useCase.execute('user-1', {
      displayName: ' Nguyen Van A ',
      phone: ' 0987654321 ',
    });

    expect(usersRepositoryMock.updateUser).toHaveBeenCalledWith('user-1', {
      displayName: 'Nguyen Van A',
      phone: '0987654321',
    });
    expect(result).toEqual({ success: true, message: 'Profile updated successfully.' });
  });

  it('rejects duplicate phone numbers', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce(createUser({ phone: '0900000000' }));
    usersRepositoryMock.findUserByEmailOrPhone.mockResolvedValueOnce(createUser({ id: 'user-2' }));

    await expect(useCase.execute('user-1', { phone: '0987654321' })).rejects.toBeInstanceOf(BadRequestException);
    expect(usersRepositoryMock.updateUser).not.toHaveBeenCalled();
  });

  it('rejects an empty update body', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce(createUser());

    await expect(useCase.execute('user-1', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(usersRepositoryMock.updateUser).not.toHaveBeenCalled();
  });
});

function createUser(overrides?: { id?: string; phone?: string | null }) {
  return {
    id: overrides?.id ?? 'user-1',
    email: 'user@example.com',
    phone: overrides?.phone ?? null,
    displayName: 'User',
    password: null,
    role: 'user',
    accountStatus: 'active',
    avatarMediaId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
