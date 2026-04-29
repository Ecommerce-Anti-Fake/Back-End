import { Test, TestingModule } from '@nestjs/testing';
import { CreateShopUseCase } from './create-shop.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('CreateShopUseCase', () => {
  let useCase: CreateShopUseCase;

  const shopsRepositoryMock = {
    countByOwnerUserId: jest.fn(),
    countCategoriesByIds: jest.fn(),
    findCategoriesByIds: jest.fn(),
    hasApprovedKycForOwner: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateShopUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateShopUseCase>(CreateShopUseCase);
  });

  it('should create shop in pending_kyc status when owner does not have approved KYC yet', async () => {
    shopsRepositoryMock.countByOwnerUserId.mockResolvedValueOnce(0);
    shopsRepositoryMock.countCategoriesByIds.mockResolvedValueOnce(1);
    shopsRepositoryMock.findCategoriesByIds.mockResolvedValueOnce([{ id: 'category-1', riskTier: 'LOW' }]);
    shopsRepositoryMock.hasApprovedKycForOwner.mockResolvedValueOnce(null);
    shopsRepositoryMock.create.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'user-1',
      shopName: 'Shop ABC',
      registrationType: 'MANUFACTURER',
      businessType: 'manufacturer',
      taxCode: null,
      shopStatus: 'pending_kyc',
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
      registeredCategories: [],
    });

    const result = await useCase.execute({
      ownerUserId: 'user-1',
      shopName: 'Shop ABC',
      registrationType: 'MANUFACTURER',
      businessType: 'manufacturer',
      taxCode: null,
      categoryIds: ['category-1'],
    });

    expect(shopsRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'user-1',
        shopStatus: 'pending_kyc',
      }),
    );
    expect(result).toMatchObject({
      id: 'shop-1',
      shopStatus: 'pending_kyc',
    });
  });

  it('should create manufacturer shop in pending_verification even when KYC is approved', async () => {
    shopsRepositoryMock.countByOwnerUserId.mockResolvedValueOnce(0);
    shopsRepositoryMock.countCategoriesByIds.mockResolvedValueOnce(1);
    shopsRepositoryMock.findCategoriesByIds.mockResolvedValueOnce([{ id: 'category-1', riskTier: 'LOW' }]);
    shopsRepositoryMock.hasApprovedKycForOwner.mockResolvedValueOnce({ id: 'kyc-1' });
    shopsRepositoryMock.create.mockResolvedValueOnce({
      id: 'shop-2',
      ownerUserId: 'user-1',
      shopName: 'Factory Shop',
      registrationType: 'MANUFACTURER',
      businessType: 'manufacturer',
      taxCode: '0312345678',
      shopStatus: 'pending_verification',
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
      registeredCategories: [],
    });

    const result = await useCase.execute({
      ownerUserId: 'user-1',
      shopName: 'Factory Shop',
      registrationType: 'MANUFACTURER',
      businessType: 'manufacturer',
      taxCode: '0312345678',
      categoryIds: ['category-1'],
    });

    expect(shopsRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopStatus: 'pending_verification',
      }),
    );
    expect(result).toMatchObject({
      id: 'shop-2',
      shopStatus: 'pending_verification',
    });
  });

  it('should reject creating a second shop for the same owner', async () => {
    shopsRepositoryMock.countByOwnerUserId.mockResolvedValueOnce(1);

    await expect(
      useCase.execute({
        ownerUserId: 'user-1',
        shopName: 'Second Shop',
        registrationType: 'NORMAL',
        businessType: 'company',
        taxCode: null,
        categoryIds: ['category-1'],
      }),
    ).rejects.toThrow('Each user can only create one shop');

    expect(shopsRepositoryMock.create).not.toHaveBeenCalled();
  });
});
