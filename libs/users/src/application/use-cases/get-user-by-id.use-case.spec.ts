import { NotFoundException } from '@nestjs/common';
import { GetUserByIdUseCase } from './get-user-by-id.use-case';

describe('GetUserByIdUseCase', () => {
  const usersRepository = {
    findAdminUserDetailById: jest.fn(),
  };
  const useCase = new GetUserByIdUseCase(usersRepository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns admin user detail with the latest shop and calculated statistics', async () => {
    usersRepository.findAdminUserDetailById.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        displayName: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0901234567',
        role: 'user',
        accountStatus: 'active',
        createdAt: new Date('2022-10-12T08:00:00.000Z'),
        updatedAt: new Date('2024-05-15T10:20:00.000Z'),
        avatarMedia: { secureUrl: 'https://cdn.example.com/avatar.jpg' },
        addresses: [{ addressLine: '123 Duy Tan, Ha Noi' }],
        ownedShops: [{
          id: 'shop-1',
          shopName: 'Masan Consumer Store',
          shopStatus: 'verified',
          warehouseAddress: '123 Duy Tan, Ha Noi',
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          avatarMedia: { secureUrl: 'https://cdn.example.com/logo.jpg' },
          bannerMedia: { secureUrl: 'https://cdn.example.com/banner.jpg' },
          registeredCategories: [{ category: { name: 'Hang tieu dung' } }],
          _count: { offers: 91 },
        }],
      },
      orders: 12,
      posts: 4,
      reports: 2,
      receivedReviews: 5,
      positiveReviews: 4,
      shopMetrics: {
        rating: 4.4,
        reviewCount: 1200,
        totalSold: 850,
        revenue: 450000000,
      },
    });

    await expect(useCase.execute('user-1')).resolves.toEqual({
      user: expect.objectContaining({
        id: 'user-1',
        avatar: 'https://cdn.example.com/avatar.jpg',
        address: '123 Duy Tan, Ha Noi',
        emailVerified: true,
        phoneVerified: true,
        sellerVerified: true,
        joinedAt: new Date('2022-10-12T08:00:00.000Z'),
        statistics: { orders: 12, posts: 4, reports: 2, positiveRate: 80 },
      }),
      shop: expect.objectContaining({
        id: 'shop-1',
        logo: 'https://cdn.example.com/logo.jpg',
        verificationStatus: 'verified',
        productCount: 91,
        revenue: 450000000,
      }),
    });
  });

  it('returns shop as null when the user has no shop', async () => {
    usersRepository.findAdminUserDetailById.mockResolvedValueOnce({
      user: {
        id: 'user-2',
        displayName: null,
        email: null,
        phone: null,
        role: 'user',
        accountStatus: 'active',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        avatarMedia: null,
        addresses: [],
        ownedShops: [],
      },
      orders: 0,
      posts: 0,
      reports: 0,
      receivedReviews: 0,
      positiveReviews: 0,
      shopMetrics: null,
    });

    const result = await useCase.execute('user-2');

    expect(result.shop).toBeNull();
    expect(result.user.statistics.positiveRate).toBe(0);
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findAdminUserDetailById.mockResolvedValueOnce(null);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
