import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { DeleteUserUseCase } from './delete-user.use-case';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;

  const usersRepositoryMock = {
    findUserById: jest.fn(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
  });

  it('should mark account inactive', async () => {
    usersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    usersRepositoryMock.updateUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      role: 'user',
      accountStatus: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute('user-1');

    expect(usersRepositoryMock.updateUser).toHaveBeenCalledWith('user-1', {
      accountStatus: 'inactive',
    });
    expect(result).toMatchObject({
      id: 'user-1',
      accountStatus: 'inactive',
    });
  });
});
