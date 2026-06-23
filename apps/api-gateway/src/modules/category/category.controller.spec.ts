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
});
