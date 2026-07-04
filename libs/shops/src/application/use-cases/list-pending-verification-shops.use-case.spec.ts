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
          businessType: 'Doanh nghiệp',
          shopStatus: 'pending_verification',
          avatarMedia: {
            secureUrl: 'https://cdn.example.com/shop.jpg',
          },
          createdAt: new Date('2026-04-15T10:00:00.000Z'),
          owner: {
            id: 'user-1',
            displayName: 'Nguyen Van A',
            email: 'owner@example.com',
          },
        },
      ],
    });

    const result = await useCase.execute({
      shopStatus: 'pending_verification',
      registrationType: 'MANUFACTURER',
      search: 'factory',
      page: 3,
      pageSize: 5,
      sortBy: 'shopName',
      sortOrder: 'asc',
    });

    expect(shopsRepositoryMock.findPendingVerificationShops).toHaveBeenCalledWith({
      shopStatus: 'pending_verification',
      registrationType: 'MANUFACTURER',
      search: 'factory',
      page: 3,
      pageSize: 5,
      sortBy: 'shopName',
      sortOrder: 'asc',
    });

    expect(result).toMatchObject({
      page: 3,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
      items: [
        {
          id: 'shop-1',
          shopName: 'Factory Shop',
          owner: {
            id: 'user-1',
            displayName: 'Nguyen Van A',
            email: 'owner@example.com',
          },
          businessType: 'Doanh nghiệp',
          avatar: 'https://cdn.example.com/shop.jpg',
          shopStatus: 'pending_verification',
        },
      ],
    });
  });

  it('should request all shops when shopStatus is omitted', async () => {
    shopsRepositoryMock.findPendingVerificationShops.mockResolvedValueOnce({ total: 0, items: [] });

    await useCase.execute();

    expect(shopsRepositoryMock.findPendingVerificationShops).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
  });
});
