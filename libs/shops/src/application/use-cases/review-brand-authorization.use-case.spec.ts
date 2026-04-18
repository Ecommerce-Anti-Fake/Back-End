import { Test, TestingModule } from '@nestjs/testing';
import { ReviewBrandAuthorizationUseCase } from './review-brand-authorization.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('ReviewBrandAuthorizationUseCase', () => {
  let useCase: ReviewBrandAuthorizationUseCase;

  const shopsRepositoryMock = {
    findBrandAuthorizationById: jest.fn(),
    reviewBrandAuthorization: jest.fn(),
    createAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewBrandAuthorizationUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ReviewBrandAuthorizationUseCase>(ReviewBrandAuthorizationUseCase);
  });

  it('should review a brand authorization and write audit log', async () => {
    shopsRepositoryMock.findBrandAuthorizationById.mockResolvedValueOnce({
      id: 'auth-1',
      shopId: 'shop-1',
      brandId: 'brand-1',
      verificationStatus: 'pending',
    });
    shopsRepositoryMock.reviewBrandAuthorization.mockResolvedValueOnce({
      id: 'auth-1',
      shopId: 'shop-1',
      brandId: 'brand-1',
      mediaAssetId: 'media-1',
      authorizationType: 'DISTRIBUTOR_AUTHORIZATION',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/shops/shop-1/brands/brand-1/authorization.pdf',
      verificationStatus: 'approved',
      reviewNote: 'Hop le',
      verifiedAt: new Date('2026-04-16T14:30:00.000Z'),
      createdAt: new Date('2026-04-16T14:20:00.000Z'),
      mediaAsset: {
        mimeType: 'application/pdf',
        publicId: 'shops/shop-1/brands/brand-1/file',
        secureUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/shops/shop-1/brands/brand-1/authorization.pdf',
      },
    });

    const result = await useCase.execute({
      authorizationId: 'auth-1',
      reviewerUserId: 'admin-1',
      verificationStatus: 'approved',
      reviewNote: 'Hop le',
    });

    expect(shopsRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BRAND_AUTHORIZATION_REVIEWED',
        fromStatus: 'pending',
        toStatus: 'approved',
      }),
    );
    expect(result).toMatchObject({
      id: 'auth-1',
      verificationStatus: 'approved',
    });
  });
});
