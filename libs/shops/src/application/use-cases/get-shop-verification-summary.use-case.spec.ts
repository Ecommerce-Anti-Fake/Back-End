import { Test, TestingModule } from '@nestjs/testing';
import { GetShopVerificationSummaryUseCase } from './get-shop-verification-summary.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('GetShopVerificationSummaryUseCase', () => {
  let useCase: GetShopVerificationSummaryUseCase;

  const shopsRepositoryMock = {
    findOwnedShop: jest.fn(),
    recomputeShopStatus: jest.fn(),
    findShopVerificationSummaryById: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetShopVerificationSummaryUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetShopVerificationSummaryUseCase>(GetShopVerificationSummaryUseCase);
  });

  it('should return missing requirements for manufacturer shop pending verification', async () => {
    shopsRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'user-1',
      registrationType: 'MANUFACTURER',
      shopStatus: 'pending_verification',
    });
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce(undefined);
    shopsRepositoryMock.findShopVerificationSummaryById.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'pending_verification',
      registrationType: 'MANUFACTURER',
      documents: [],
      registeredCategories: [
        {
          categoryId: 'category-1',
          registrationStatus: 'pending',
          reviewNote: null,
          approvedAt: null,
          category: {
            id: 'category-1',
            name: 'My pham',
            riskTier: 'HIGH',
          },
          documents: [],
        },
      ],
      owner: {
        kyc: {
          verificationStatus: 'approved',
          documents: [{ side: 'FRONT' }, { side: 'BACK' }],
        },
      },
    });

    const result = await useCase.execute({
      shopId: 'shop-1',
      requesterUserId: 'user-1',
    });

    expect(result).toMatchObject({
      shopId: 'shop-1',
      shopStatus: 'pending_verification',
      canOperate: false,
      kycStatus: 'approved',
      requiresShopDocuments: true,
      hasApprovedShopDocument: false,
      missingRequirements: ['SHOP_DOCUMENT_APPROVAL_REQUIRED', 'CATEGORY_APPROVAL_REQUIRED'],
    });
  });
});
