import { PATH_METADATA } from '@nestjs/common/constants';
import { CategoryController } from './category.controller';

describe('CategoryController routes', () => {
  it('exposes categories without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, CategoryController)).toBe('/');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        CategoryController.prototype.findCategories,
      ),
    ).toBe('categories');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        CategoryController.prototype.createCategory,
      ),
    ).toBe('categories');
  });

  it('returns a success message after creating a category', async () => {
    const catalogRpcService = {
      createCategory: jest.fn().mockResolvedValue({
        id: 'category-1',
        name: 'My pham',
        imageUrl: 'https://cdn.test/categories/my-pham.jpg',
      }),
    };
    const controller = new CategoryController(catalogRpcService as never);

    await expect(
      controller.createCategory(
        'admin-1',
        { name: 'My pham', riskTier: 'medium' },
        {
          buffer: Buffer.from('image'),
          mimetype: 'image/png',
          size: 1024,
        },
      ),
    ).resolves.toEqual({
      success: true,
      message: 'Category created successfully.',
    });

    expect(catalogRpcService.createCategory).toHaveBeenCalledWith({
      requesterUserId: 'admin-1',
      name: 'My pham',
      parentId: null,
      image: {
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
        size: 1024,
      },
      riskTier: 'medium',
    });
  });
});
