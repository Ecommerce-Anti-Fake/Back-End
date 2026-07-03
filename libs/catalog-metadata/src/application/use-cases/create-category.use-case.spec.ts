import { BadRequestException } from '@nestjs/common';
import { CreateCategoryUseCase } from './create-category.use-case';

describe('CreateCategoryUseCase', () => {
  const repository = {
    findCategoryById: jest.fn(),
    createCategory: jest.fn(),
  };
  const mediaService = {
    uploadCloudinaryBuffer: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('uploads the category image and saves the resulting imageUrl', async () => {
    repository.createCategory.mockResolvedValue({
      id: 'category-1',
      parentId: null,
      name: 'My pham',
      imageUrl: 'https://cdn.test/categories/my-pham.jpg',
      riskTier: 'medium',
    });
    mediaService.uploadCloudinaryBuffer.mockResolvedValue({
      publicId: 'categories/admin-1',
      secureUrl: 'https://cdn.test/categories/my-pham.jpg',
    });
    const useCase = new CreateCategoryUseCase(repository as never, mediaService as never);

    await expect(
      useCase.execute({
        requesterUserId: 'admin-1',
        name: ' My pham ',
        image: {
          buffer: Buffer.from('image'),
          mimetype: 'image/png',
          size: 1024,
        },
      }),
    ).resolves.toEqual({
      id: 'category-1',
      parentId: null,
      name: 'My pham',
      imageUrl: 'https://cdn.test/categories/my-pham.jpg',
      riskTier: 'medium',
    });

    expect(mediaService.uploadCloudinaryBuffer).toHaveBeenCalledWith({
      buffer: Buffer.from('image'),
      folder: 'categories',
      requesterUserId: 'admin-1',
      assetType: 'IMAGE',
      mimeType: 'image/png',
    });
    expect(repository.createCategory).toHaveBeenCalledWith({
      name: 'My pham',
      parentId: null,
      imageUrl: 'https://cdn.test/categories/my-pham.jpg',
      riskTier: 'medium',
    });
  });

  it('rejects category creation without an image file', async () => {
    const useCase = new CreateCategoryUseCase(repository as never, mediaService as never);

    await expect(
      useCase.execute({
        requesterUserId: 'admin-1',
        name: 'My pham',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mediaService.uploadCloudinaryBuffer).not.toHaveBeenCalled();
  });

  it('deletes the uploaded image when category persistence fails', async () => {
    repository.createCategory.mockRejectedValue(new Error('db failed'));
    mediaService.uploadCloudinaryBuffer.mockResolvedValue({
      publicId: 'categories/admin-1',
      secureUrl: 'https://cdn.test/categories/my-pham.jpg',
    });
    const useCase = new CreateCategoryUseCase(repository as never, mediaService as never);

    await expect(
      useCase.execute({
        requesterUserId: 'admin-1',
        name: 'My pham',
        image: {
          buffer: Buffer.from('image'),
          mimetype: 'image/png',
          size: 1024,
        },
      }),
    ).rejects.toThrow('db failed');

    expect(mediaService.deleteCloudinaryAsset).toHaveBeenCalledWith({
      publicId: 'categories/admin-1',
      assetType: 'IMAGE',
    });
  });
});
