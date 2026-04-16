import { Test, TestingModule } from '@nestjs/testing';
import { GetAdminShopVerificationDetailUseCase } from './get-admin-shop-verification-detail.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('GetAdminShopVerificationDetailUseCase', () => {
  let useCase: GetAdminShopVerificationDetailUseCase;

  const shopsRepositoryMock = {
    recomputeShopStatus: jest.fn(),
    findAdminShopVerificationDetailById: jest.fn(),
    findAuditLogsByTarget: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAdminShopVerificationDetailUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetAdminShopVerificationDetailUseCase>(GetAdminShopVerificationDetailUseCase);
  });

  it('should group shop and category document history with latest submission first', async () => {
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce(undefined);
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'user-1',
      shopName: 'Factory Shop',
      registrationType: 'MANUFACTURER',
      shopStatus: 'pending_verification',
      businessType: 'manufacturer',
      taxCode: '0312345678',
      createdAt: new Date('2026-04-15T08:00:00.000Z'),
      owner: {
        id: 'user-1',
        displayName: 'Nguyen Van A',
        email: 'owner@example.com',
        phone: '0987654321',
        kyc: {
          verificationStatus: 'approved',
          documents: [{ side: 'FRONT' }, { side: 'BACK' }],
        },
      },
      documents: [
        {
          id: 'shop-doc-old',
          docType: 'BUSINESS_LICENSE',
          fileUrl: 'https://example.com/old.jpg',
          mediaAssetId: 'media-old',
          reviewStatus: 'rejected',
          reviewNote: 'Mo anh',
          reviewedAt: new Date('2026-04-15T09:00:00.000Z'),
          uploadedAt: new Date('2026-04-15T08:30:00.000Z'),
        },
        {
          id: 'shop-doc-new',
          docType: 'BUSINESS_LICENSE',
          fileUrl: 'https://example.com/new.jpg',
          mediaAssetId: 'media-new',
          reviewStatus: 'pending',
          reviewNote: null,
          reviewedAt: null,
          uploadedAt: new Date('2026-04-15T10:30:00.000Z'),
        },
      ],
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
          documents: [
            {
              id: 'cat-doc-old',
              documentType: 'CATEGORY_CERTIFICATE',
              fileUrl: 'https://example.com/cat-old.jpg',
              mediaAssetId: 'media-cat-old',
              documentNumber: 'GCN-001',
              issuedBy: 'Bo Y Te',
              issuedAt: null,
              expiresAt: null,
              reviewStatus: 'rejected',
              reviewNote: 'Het han',
              reviewedAt: new Date('2026-04-15T09:15:00.000Z'),
              uploadedAt: new Date('2026-04-15T08:45:00.000Z'),
            },
            {
              id: 'cat-doc-new',
              documentType: 'CATEGORY_CERTIFICATE',
              fileUrl: 'https://example.com/cat-new.jpg',
              mediaAssetId: 'media-cat-new',
              documentNumber: 'GCN-002',
              issuedBy: 'Bo Y Te',
              issuedAt: null,
              expiresAt: null,
              reviewStatus: 'pending',
              reviewNote: null,
              reviewedAt: null,
              uploadedAt: new Date('2026-04-15T10:45:00.000Z'),
            },
          ],
        },
      ],
    });
    shopsRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([
      {
        id: 'audit-1',
        action: 'SHOP_DOCUMENT_SUBMITTED',
        fromStatus: null,
        toStatus: null,
        note: '1 document submitted',
        actorUserId: 'user-1',
        createdAt: new Date('2026-04-15T10:40:00.000Z'),
        actor: {
          displayName: 'Nguyen Van A',
          email: 'owner@example.com',
        },
      },
    ]);

    const result = await useCase.execute('shop-1');

    expect(result.shopDocumentGroups).toHaveLength(1);
    expect(result.shopDocumentGroups[0]).toMatchObject({
      docType: 'BUSINESS_LICENSE',
      latestSubmission: {
        id: 'shop-doc-new',
        reviewStatus: 'pending',
      },
    });
    expect(result.shopDocumentGroups[0].history.map((item: { id: string }) => item.id)).toEqual([
      'shop-doc-new',
      'shop-doc-old',
    ]);

    expect(result.categoryDocumentGroups).toHaveLength(1);
    expect(result.categoryDocumentGroups[0]).toMatchObject({
      categoryId: 'category-1',
      categoryName: 'My pham',
      documentType: 'CATEGORY_CERTIFICATE',
      latestSubmission: {
        id: 'cat-doc-new',
        reviewStatus: 'pending',
      },
    });
    expect(result.categoryDocumentGroups[0].history.map((item: { id: string }) => item.id)).toEqual([
      'cat-doc-new',
      'cat-doc-old',
    ]);
    expect(result.timeline).toMatchObject([
      {
        id: 'audit-1',
        action: 'SHOP_DOCUMENT_SUBMITTED',
      },
    ]);
  });
});
