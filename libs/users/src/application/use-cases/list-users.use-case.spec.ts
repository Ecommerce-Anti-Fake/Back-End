import { ListUsersUseCase } from './list-users.use-case';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

describe('ListUsersUseCase', () => {
  const usersRepositoryMock = {
    listForAdmin: jest.fn(),
  };

  let useCase: ListUsersUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new ListUsersUseCase(usersRepositoryMock as never);
  });

  it('returns admin user list items with shop name and localized account status', async () => {
    usersRepositoryMock.listForAdmin.mockResolvedValueOnce({
      totalItems: 1,
      totalUser: 150,
      totalShop: 58,
      activeUser: 138,
      bannedUser: 12,
      items: [
        {
          id: '73d1fd5d-62e0-4a17-ac4c-fd8db5a4ade7',
          email: 'e@gmail.com',
          displayName: 'E',
          avatarMedia: { secureUrl: 'https://example.com/avatar.jpg' },
          accountStatus: 'active',
          createdAt: new Date('2026-03-07T00:00:00.000Z'),
          ownedShops: [{ shopName: 'E Shop' }],
        },
      ],
    });

    await expect(useCase.execute({ role: 'user', status: 'all', page: 1, pageSize: 10 })).resolves.toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
      totalUser: 150,
      totalShop: 58,
      activeUser: 138,
      bannedUser: 12,
      items: [
        {
          id: '73d1fd5d-62e0-4a17-ac4c-fd8db5a4ade7',
          email: 'e@gmail.com',
          displayName: 'E',
          avatar: 'https://example.com/avatar.jpg',
          shopName: 'E Shop',
          accountStatus: 'Đang hoạt động',
          createdAt: new Date('2026-03-07T00:00:00.000Z'),
        },
      ],
    });

    expect(usersRepositoryMock.listForAdmin).toHaveBeenCalledWith({
      role: 'user',
      status: 'all',
      page: 1,
      pageSize: 10,
    });
  });

  it('uses all status and pagination defaults', async () => {
    usersRepositoryMock.listForAdmin.mockResolvedValueOnce({
      totalItems: 0,
      totalUser: 0,
      totalShop: 0,
      activeUser: 0,
      bannedUser: 0,
      items: [],
    });

    await expect(useCase.execute()).resolves.toMatchObject({ page: 1, pageSize: 10, totalPages: 0, items: [] });
    expect(usersRepositoryMock.listForAdmin).toHaveBeenCalledWith({
      role: 'user',
      status: 'all',
      page: 1,
      pageSize: 10,
    });
  });
});
