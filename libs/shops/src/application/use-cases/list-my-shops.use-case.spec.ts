import { Test, TestingModule } from '@nestjs/testing';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { ListMyShopsUseCase } from './list-my-shops.use-case';

describe('ListMyShopsUseCase', () => {
  let useCase: ListMyShopsUseCase;

  const shopsRepositoryMock = {
    findByOwnerUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListMyShopsUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ListMyShopsUseCase>(ListMyShopsUseCase);
  });

  it('returns owned shops without registeredCategories', async () => {
    shopsRepositoryMock.findByOwnerUserId.mockResolvedValueOnce([
      {
        id: 'shop-1',
        ownerUserId: 'user-1',
        shopName: 'Shop ABC',
        registrationType: 'MANUFACTURER',
        businessType: 'manufacturer',
        phone: null,
        taxCode: null,
        warehouseAddress: '12 Nguyen Trai',
        warehouseProvinceCode: 'VN-P202',
        warehouseProvinceName: 'TP Ho Chi Minh',
        warehouseWardCode: 'VN-P202-W1',
        warehouseWardName: 'Phuong 1',
        shopStatus: 'verified',
        avatarMedia: { secureUrl: 'https://cdn.test/shop-avatar.jpg' },
        bannerMedia: { secureUrl: 'https://cdn.test/shop-banner.jpg' },
        createdAt: new Date('2026-06-29T02:00:00.000Z'),
        registeredCategories: [
          {
            registrationStatus: 'approved',
            category: {
              id: 'category-1',
              name: 'My pham',
            },
          },
        ],
      },
    ]);

    const result = await useCase.execute('user-1');

    expect(result).toEqual([
      {
        id: 'shop-1',
        ownerUserId: 'user-1',
        shopName: 'Shop ABC',
        registrationType: 'MANUFACTURER',
        businessType: 'manufacturer',
        phone: null,
        taxCode: null,
        warehouseAddress: '12 Nguyen Trai',
        warehouseProvinceCode: 'VN-P202',
        warehouseProvinceName: 'TP Ho Chi Minh',
        warehouseWardCode: 'VN-P202-W1',
        warehouseWardName: 'Phuong 1',
        shopStatus: 'verified',
        avatar: 'https://cdn.test/shop-avatar.jpg',
        banner: 'https://cdn.test/shop-banner.jpg',
        createdAt: new Date('2026-06-29T02:00:00.000Z'),
      },
    ]);
    expect(result[0]).not.toHaveProperty('registeredCategories');
  });
});
