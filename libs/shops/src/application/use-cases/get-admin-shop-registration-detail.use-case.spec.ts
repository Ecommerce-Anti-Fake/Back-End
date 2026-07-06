import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { GetAdminShopRegistrationDetailUseCase } from './get-admin-shop-registration-detail.use-case';

describe('GetAdminShopRegistrationDetailUseCase', () => {
  let useCase: GetAdminShopRegistrationDetailUseCase;

  const shopsRepositoryMock = {
    recomputeShopStatus: jest.fn(),
    findAdminShopVerificationDetailById: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAdminShopRegistrationDetailUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetAdminShopRegistrationDetailUseCase>(GetAdminShopRegistrationDetailUseCase);
  });

  it('returns shop registration detail with basic info, legal profile, and CCCD profile', async () => {
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce(undefined);
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'user-1',
      shopName: 'Factory Shop',
      registrationType: 'MANUFACTURER',
      shopType: null,
      shopStatus: 'pending_verification',
      businessType: 'manufacturer',
      taxCode: '0312345678',
      warehouseAddress: '12 Nguyen Trai',
      warehouseProvinceCode: 'VN-P202',
      warehouseProvinceName: 'TP Ho Chi Minh',
      warehouseWardCode: 'VN-P202-D1450-W21211',
      warehouseWardName: 'Phuong Ben Nghe',
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
          dateOfBirth: new Date('1998-05-10T00:00:00.000Z'),
          idType: 'CCCD',
          kycLevel: 'basic',
          verificationStatus: 'approved',
          reviewNote: null,
          verifiedAt: new Date('2026-04-16T09:00:00.000Z'),
          documents: [
            {
              id: 'kyc-doc-front',
              side: 'FRONT',
              mediaAssetId: 'media-front',
              uploadedAt: new Date('2026-04-15T08:10:00.000Z'),
              mediaAsset: {
                assetType: 'IMAGE',
                mimeType: 'image/jpeg',
                publicId: 'kyc/user-1/front',
                secureUrl: 'https://example.com/front.jpg',
              },
            },
            {
              id: 'kyc-doc-back',
              side: 'BACK',
              mediaAssetId: 'media-back',
              uploadedAt: new Date('2026-04-15T08:11:00.000Z'),
              mediaAsset: {
                assetType: 'IMAGE',
                mimeType: 'image/jpeg',
                publicId: 'kyc/user-1/back',
                secureUrl: 'https://example.com/back.jpg',
              },
            },
          ],
        },
      },
      documents: [
        {
          id: 'shop-doc-1',
          docType: 'BUSINESS_LICENSE',
          fileUrl: 'https://example.com/license.jpg',
          mediaAssetId: 'media-license',
          files: [],
          reviewStatus: 'pending',
          reviewNote: null,
          reviewedAt: null,
          uploadedAt: new Date('2026-04-15T10:30:00.000Z'),
        },
      ],
      registeredCategories: [
        {
          categoryId: 'category-1',
          registrationStatus: 'approved',
          reviewNote: null,
          approvedAt: new Date('2026-04-15T09:00:00.000Z'),
          category: {
            id: 'category-1',
            name: 'My pham',
            riskTier: 'HIGH',
          },
        },
      ],
    });

    const result = await useCase.execute('shop-1');

    expect(result).toMatchObject({
      shopId: 'shop-1',
      basicInfo: {
        shopName: 'Factory Shop',
        owner: {
          id: 'user-1',
          email: 'owner@example.com',
        },
        registeredCategories: [
          {
            categoryId: 'category-1',
            categoryName: 'My pham',
            registrationStatus: 'approved',
          },
        ],
      },
      legalProfile: {
        documents: [
          {
            id: 'shop-doc-1',
            docType: 'BUSINESS_LICENSE',
            reviewStatus: 'pending',
          },
        ],
      },
      identityProfile: {
        id: 'kyc-1',
        idType: 'CCCD',
        documents: [
          {
            side: 'FRONT',
            fileUrl: 'https://example.com/front.jpg',
          },
          {
            side: 'BACK',
            fileUrl: 'https://example.com/back.jpg',
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain('idNumberHash');
  });

  it('throws NotFoundException when shop does not exist', async () => {
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce(undefined);
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce(null);

    await expect(useCase.execute('missing-shop')).rejects.toBeInstanceOf(NotFoundException);
  });
});
