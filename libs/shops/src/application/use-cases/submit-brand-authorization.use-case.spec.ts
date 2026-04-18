import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { SubmitBrandAuthorizationUseCase } from './submit-brand-authorization.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('SubmitBrandAuthorizationUseCase', () => {
  let useCase: SubmitBrandAuthorizationUseCase;

  const shopsRepositoryMock = {
    findOwnedShop: jest.fn(),
    findBrandById: jest.fn(),
    findBrandAuthorizationsByShopId: jest.fn(),
    upsertBrandAuthorization: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const mediaServiceMock = {
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitBrandAuthorizationUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<SubmitBrandAuthorizationUseCase>(SubmitBrandAuthorizationUseCase);
  });

  it('should submit brand authorization for distributor shop', async () => {
    shopsRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      registrationType: 'DISTRIBUTOR',
    });
    shopsRepositoryMock.findBrandById.mockResolvedValueOnce({ id: 'brand-1' });
    mediaServiceMock.isOwnedCloudinaryUrl.mockReturnValue(true);
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({ id: 'media-1' });
    shopsRepositoryMock.findBrandAuthorizationsByShopId.mockResolvedValueOnce([]);
    shopsRepositoryMock.upsertBrandAuthorization.mockResolvedValueOnce({
      id: 'auth-1',
      shopId: 'shop-1',
      brandId: 'brand-1',
      mediaAssetId: 'media-1',
      authorizationType: 'DISTRIBUTOR_AUTHORIZATION',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/shops/shop-1/brands/brand-1/authorization.pdf',
      verificationStatus: 'pending',
      reviewNote: null,
      verifiedAt: null,
      createdAt: new Date('2026-04-16T14:20:00.000Z'),
      mediaAsset: {
        mimeType: 'application/pdf',
        publicId: 'shops/shop-1/brands/brand-1/file',
        secureUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/shops/shop-1/brands/brand-1/authorization.pdf',
      },
    });

    const result = await useCase.execute({
      shopId: 'shop-1',
      brandId: 'brand-1',
      requesterUserId: 'user-1',
      authorizationType: 'DISTRIBUTOR_AUTHORIZATION',
      mimeType: 'application/pdf',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/shops/shop-1/brands/brand-1/authorization.pdf',
      publicId: 'shops/shop-1/brands/brand-1/file',
    });

    expect(shopsRepositoryMock.upsertBrandAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        brandId: 'brand-1',
        mediaAssetId: 'media-1',
      }),
    );
    expect(result).toMatchObject({
      id: 'auth-1',
      verificationStatus: 'pending',
    });
  });
});
