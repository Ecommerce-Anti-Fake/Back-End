import { Test, TestingModule } from '@nestjs/testing';
import { ListPendingVerificationShopsUseCase } from './list-pending-verification-shops.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('ListPendingVerificationShopsUseCase', () => {
  let useCase: ListPendingVerificationShopsUseCase;

  const shopsRepositoryMock = {
    findPendingVerificationShops: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPendingVerificationShopsUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ListPendingVerificationShopsUseCase>(ListPendingVerificationShopsUseCase);
  });

  it('should return pending verification shops for admin review', async () => {
    shopsRepositoryMock.findPendingVerificationShops.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'shop-1',
          shopName: 'Factory Shop',
          ownerUserId: 'user-1',
          registrationType: 'MANUFACTURER',
          shopStatus: 'pending_verification',
          createdAt: new Date('2026-04-15T10:00:00.000Z'),
          owner: {
            displayName: 'Nguyen Van A',
            email: 'owner@example.com',
            phone: '0987654321',
          },
          documents: [{ reviewStatus: 'pending' }],
          registeredCategories: [
            {
              registrationStatus: 'pending',
              category: {
                id: 'category-1',
                name: 'My pham',
              },
            },
          ],
        },
      ],
    });

    const result = await useCase.execute({
      shopStatus: 'pending_verification',
      registrationType: 'MANUFACTURER',
      categoryId: 'category-1',
      search: 'factory',
      page: 3,
      pageSize: 5,
      sortBy: 'shopName',
      sortOrder: 'asc',
    });

    expect(shopsRepositoryMock.findPendingVerificationShops).toHaveBeenCalledWith({
      shopStatus: 'pending_verification',
      registrationType: 'MANUFACTURER',
      categoryId: 'category-1',
      search: 'factory',
      page: 3,
      pageSize: 5,
      sortBy: 'shopName',
      sortOrder: 'asc',
    });

    expect(result).toMatchObject({
      page: 3,
      pageSize: 5,
      total: 1,
      items: [
        {
          id: 'shop-1',
          shopName: 'Factory Shop',
          ownerUserId: 'user-1',
          ownerDisplayName: 'Nguyen Van A',
          registrationType: 'MANUFACTURER',
          shopStatus: 'pending_verification',
          shopDocumentCount: 1,
          approvedShopDocumentCount: 0,
        },
      ],
    });
  });
});
