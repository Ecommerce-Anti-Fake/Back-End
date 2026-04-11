import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UpdateUserUseCase } from './update-user.use-case';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;

  const usersRepositoryMock = {
    findUserById: jest.fn(),
    findUserByEmailOrPhone: jest.fn(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);
  });

  it('should update displayName, email and phone', async () => {
    usersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0987654321',
      displayName: 'User',
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    usersRepositoryMock.findUserByEmailOrPhone.mockResolvedValueOnce(null);
    usersRepositoryMock.updateUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'updated@example.com',
      phone: null,
      displayName: 'Updated User',
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute('user-1', {
      email: 'UPDATED@example.com',
      phone: '',
      displayName: 'Updated User',
    });

    expect(usersRepositoryMock.updateUser).toHaveBeenCalledWith('user-1', {
      email: 'updated@example.com',
      phone: null,
      displayName: 'Updated User',
    });
    expect(result).toMatchObject({
      id: 'user-1',
      email: 'updated@example.com',
      displayName: 'Updated User',
    });
  });
});
