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

  it('should return shop document requirement for pending verification shop', async () => {
    shopsRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'user-1',
      registrationType: 'NORMAL',
      shopStatus: 'pending_verification',
    });
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce(undefined);
    shopsRepositoryMock.findShopVerificationSummaryById.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'pending_verification',
      registrationType: 'NORMAL',
      documents: [
        {
          reviewStatus: 'rejected',
          reviewNote: 'Giay phep kinh doanh bi mo',
          uploadedAt: new Date('2026-04-15T12:00:00.000Z'),
        },
      ],
      registeredCategories: [
        {
          categoryId: 'category-1',
          registrationStatus: 'approved',
          reviewNote: null,
          approvedAt: new Date('2026-04-15T11:00:00.000Z'),
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
          verificationStatus: 'rejected',
          reviewNote: 'Anh CCCD chua ro',
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
      reviewNote: 'Anh CCCD chua ro',
      kycStatus: 'rejected',
      requiresShopDocuments: true,
      hasApprovedShopDocument: false,
      missingRequirements: ['KYC_APPROVAL_REQUIRED', 'SHOP_DOCUMENT_APPROVAL_REQUIRED'],
      categories: [
        expect.objectContaining({
          categoryId: 'category-1',
          requiredVerification: false,
          registrationStatus: 'approved',
        }),
      ],
    });
  });

  it('should return latest rejected shop document review note when KYC is not rejected', async () => {
    shopsRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'user-1',
      registrationType: 'NORMAL',
      shopStatus: 'rejected',
    });
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce(undefined);
    shopsRepositoryMock.findShopVerificationSummaryById.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'rejected',
      registrationType: 'NORMAL',
      documents: [
        {
          reviewStatus: 'rejected',
          reviewNote: 'Giay phep cu',
          uploadedAt: new Date('2026-04-15T10:00:00.000Z'),
        },
        {
          reviewStatus: 'rejected',
          reviewNote: 'Giay phep moi bi mo',
          uploadedAt: new Date('2026-04-15T12:00:00.000Z'),
        },
      ],
      registeredCategories: [],
      owner: {
        kyc: {
          verificationStatus: 'approved',
          reviewNote: null,
          documents: [{ side: 'FRONT' }, { side: 'BACK' }],
        },
      },
    });

    const result = await useCase.execute({
      shopId: 'shop-1',
      requesterUserId: 'user-1',
    });

    expect(result.reviewNote).toBe('Giay phep moi bi mo');
  });
});
