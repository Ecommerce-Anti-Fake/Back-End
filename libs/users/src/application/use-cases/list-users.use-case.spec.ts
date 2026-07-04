import { ListUsersUseCase } from './list-users.use-case';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

describe('ListUsersUseCase', () => {
  const usersRepositoryMock = {
    findAll: jest.fn(),
  };

  let useCase: ListUsersUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new ListUsersUseCase(usersRepositoryMock as never);
  });

  it('returns admin user list items with shop name and localized account status', async () => {
    usersRepositoryMock.findAll.mockResolvedValueOnce([
      {
        id: '73d1fd5d-62e0-4a17-ac4c-fd8db5a4ade7',
        email: 'e@gmail.com',
        displayName: 'E',
        accountStatus: 'active',
        createdAt: new Date('2026-03-07T00:00:00.000Z'),
        ownedShops: [{ shopName: 'E Shop' }],
      },
    ]);

    await expect(useCase.execute('user')).resolves.toEqual([
      {
        id: '73d1fd5d-62e0-4a17-ac4c-fd8db5a4ade7',
        email: 'e@gmail.com',
        displayName: 'E',
        shopName: 'E Shop',
        accountStatus: 'Đang hoạt động',
        createdAt: new Date('2026-03-07T00:00:00.000Z'),
      },
    ]);
  });
});
