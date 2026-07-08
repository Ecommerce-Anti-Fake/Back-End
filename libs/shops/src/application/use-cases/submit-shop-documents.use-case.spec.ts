import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { SubmitShopDocumentsUseCase } from './submit-shop-documents.use-case';

describe('SubmitShopDocumentsUseCase', () => {
  let useCase: SubmitShopDocumentsUseCase;

  const shopsRepositoryMock = {
    findOwnedShop: jest.fn(),
    findRequirementForShopType: jest.fn(),
    createShopDocument: jest.fn(),
    createAuditLog: jest.fn(),
    recomputeShopStatus: jest.fn(),
  };

  const mediaServiceMock = {
    uploadCloudinaryBuffer: jest.fn(),
    createCloudinaryAsset: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitShopDocumentsUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<SubmitShopDocumentsUseCase>(SubmitShopDocumentsUseCase);
    shopsRepositoryMock.findOwnedShop.mockResolvedValue({
      id: 'shop-1',
      shopTypeId: 'type-1',
    });
    shopsRepositoryMock.findRequirementForShopType.mockResolvedValue({
      requirement: { id: 'requirement-1' },
    });
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValue({
      id: 'shop-1',
      shopStatus: 'pending_verification',
    });
  });

  it('uploads images and persists them under their document type', async () => {
    mediaServiceMock.uploadCloudinaryBuffer.mockResolvedValueOnce({
      publicId: 'shops/shop-1/documents/user-1-1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/shops/shop-1/documents/user-1-1.jpg',
    });
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'media-1',
    });

    await useCase.execute({
      shopId: 'shop-1',
      requesterUserId: 'user-1',
      items: [
        {
          docType: 'BUSINESS_LICENSE',
          file: {
            buffer: Buffer.from('image'),
            mimetype: 'image/jpeg',
            originalname: 'license.jpg',
            size: 5,
          },
        },
      ],
    });

    expect(mediaServiceMock.uploadCloudinaryBuffer).toHaveBeenCalledWith({
      buffer: Buffer.from('image'),
      folder: 'shops/shop-1/documents',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      mimeType: 'image/jpeg',
      sequence: 1,
    });
    expect(shopsRepositoryMock.createShopDocument).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requirementId: 'requirement-1',
      docType: 'BUSINESS_LICENSE',
      files: [
        {
          mediaAssetId: 'media-1',
          fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/shops/shop-1/documents/user-1-1.jpg',
        },
      ],
    });
    expect(shopsRepositoryMock.recomputeShopStatus).toHaveBeenCalledWith('shop-1', {
      resetRejected: true,
    });
  });

  it('rejects non-image shop document files', async () => {
    await expect(
      useCase.execute({
        shopId: 'shop-1',
        requesterUserId: 'user-1',
        items: [
          {
            docType: 'BUSINESS_LICENSE',
            file: {
              buffer: Buffer.from('pdf'),
              mimetype: 'application/pdf',
              originalname: 'license.pdf',
              size: 3,
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mediaServiceMock.uploadCloudinaryBuffer).not.toHaveBeenCalled();
  });
});
