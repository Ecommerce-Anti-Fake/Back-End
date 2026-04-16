import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { SubmitCategoryDocumentsUseCase } from './submit-category-documents.use-case';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

describe('SubmitCategoryDocumentsUseCase', () => {
  let useCase: SubmitCategoryDocumentsUseCase;

  const shopsRepositoryMock = {
    findOwnedShop: jest.fn(),
    findShopBusinessCategory: jest.fn(),
    markShopCategoryPendingReview: jest.fn(),
    createCategoryDocument: jest.fn(),
    createAuditLog: jest.fn(),
    recomputeShopStatus: jest.fn(),
  };

  const mediaServiceMock = {
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitCategoryDocumentsUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<SubmitCategoryDocumentsUseCase>(SubmitCategoryDocumentsUseCase);
  });

  it('should reset rejected category registration back to pending when resubmitting documents', async () => {
    shopsRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
    });
    shopsRepositoryMock.findShopBusinessCategory.mockResolvedValueOnce({
      id: 'registration-1',
      registrationStatus: 'rejected',
    });
    shopsRepositoryMock.markShopCategoryPendingReview.mockResolvedValueOnce({ count: 1 });
    mediaServiceMock.isOwnedCloudinaryUrl.mockReturnValue(true);
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'media-1',
    });
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'pending_verification',
    });

    await useCase.execute({
      shopId: 'shop-1',
      categoryId: 'category-1',
      requesterUserId: 'user-1',
      items: [
        {
          documentType: 'CATEGORY_CERTIFICATE',
          mimeType: 'image/jpeg',
          fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/shops/shop-1/categories/category-1/certificate.jpg',
          publicId: 'shops/shop-1/categories/category-1/certificate',
        },
      ],
    });

    expect(shopsRepositoryMock.markShopCategoryPendingReview).toHaveBeenCalledWith('shop-1', 'category-1');
    expect(shopsRepositoryMock.createCategoryDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        shopBusinessCategoryId: 'registration-1',
        mediaAssetId: 'media-1',
      }),
    );
    expect(shopsRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'SHOP_VERIFICATION',
        action: 'CATEGORY_DOCUMENT_SUBMITTED',
        fromStatus: 'rejected',
        toStatus: 'pending',
      }),
    );
  });
});
