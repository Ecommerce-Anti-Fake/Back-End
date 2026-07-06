import { Test, TestingModule } from '@nestjs/testing';
import { GetAdminShopVerificationDetailUseCase } from './get-admin-shop-verification-detail.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('GetAdminShopVerificationDetailUseCase', () => {
  let useCase: GetAdminShopVerificationDetailUseCase;

  const shopsRepositoryMock = {
    recomputeShopStatus: jest.fn(),
    findAdminShopVerificationDetailById: jest.fn(),
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

  it('should return the compact admin verification detail contract', async () => {
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce(undefined);
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'user-1',
      shopName: 'Factory Shop',
      registrationType: 'MANUFACTURER',
      shopType: {
        id: 'shop-type-1',
        code: 'MANUFACTURER',
        name: 'Nha san xuat',
        description: null,
        requirements: [
          {
            requirementId: 'requirement-1',
            required: true,
            sortOrder: 1,
            requirement: {
              id: 'requirement-1',
              code: 'BUSINESS_LICENSE',
              name: 'Giay phep kinh doanh',
              description: null,
              multipleFilesAllowed: true,
            },
          },
        ],
      },
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
          id: 'kyc-1',
          userId: 'user-1',
          fullName: 'Nguyen Van A',
          dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
          idType: 'CCCD',
          kycLevel: 'basic',
          verificationStatus: 'approved',
          reviewNote: null,
          verifiedAt: null,
          documents: [
            {
              id: 'kyc-front',
              side: 'FRONT',
              mediaAssetId: 'media-front',
              uploadedAt: new Date('2026-04-15T07:00:00.000Z'),
              mediaAsset: {
                assetType: 'IMAGE',
                mimeType: 'image/jpeg',
                publicId: 'kyc/front',
                secureUrl: 'https://example.com/front.jpg',
              },
            },
            {
              id: 'kyc-back',
              side: 'BACK',
              mediaAssetId: 'media-back',
              uploadedAt: new Date('2026-04-15T07:05:00.000Z'),
              mediaAsset: {
                assetType: 'IMAGE',
                mimeType: 'image/jpeg',
                publicId: 'kyc/back',
                secureUrl: 'https://example.com/back.jpg',
              },
            },
          ],
        },
      },
      documents: [
        {
          id: 'shop-doc-old',
          requirementId: 'requirement-1',
          docType: 'BUSINESS_LICENSE',
          files: [
            {
              id: 'shop-doc-file-old',
              fileUrl: 'https://example.com/old.jpg',
              mediaAssetId: 'media-old',
              sortOrder: 0,
              uploadedAt: new Date('2026-04-15T08:30:00.000Z'),
            },
          ],
          reviewStatus: 'rejected',
          reviewNote: 'Mo anh',
          reviewedAt: new Date('2026-04-15T09:00:00.000Z'),
          uploadedAt: new Date('2026-04-15T08:30:00.000Z'),
        },
        {
          id: 'shop-doc-new',
          requirementId: 'requirement-1',
          docType: 'BUSINESS_LICENSE',
          files: [
            {
              id: 'shop-doc-file-new',
              fileUrl: 'https://example.com/new.jpg',
              mediaAssetId: 'media-new',
              sortOrder: 0,
              uploadedAt: new Date('2026-04-15T10:30:00.000Z'),
            },
          ],
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
        },
      ],
    });
    const result = await useCase.execute('shop-1');

    expect(result).toEqual({
      shop: {
        id: 'shop-1',
        shopName: 'Factory Shop',
        registrationType: 'MANUFACTURER',
        businessType: 'manufacturer',
        taxCode: '0312345678',
        status: 'pending_verification',
        createdAt: new Date('2026-04-15T08:00:00.000Z'),
      },
      owner: {
        id: 'user-1',
        displayName: 'Nguyen Van A',
        email: 'owner@example.com',
        phone: '0987654321',
      },
      categories: [{ id: 'category-1', name: 'My pham' }],
      kyc: {
        type: 'CCCD',
        frontImage: 'https://example.com/front.jpg',
        backImage: 'https://example.com/back.jpg',
        status: 'approved',
      },
      documents: [
        {
          id: 'requirement-1',
          code: 'BUSINESS_LICENSE',
          name: 'Giay phep kinh doanh',
          required: true,
          status: 'pending',
          files: ['https://example.com/new.jpg'],
        },
      ],
    });
  });
});
