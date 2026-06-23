import { PATH_METADATA } from '@nestjs/common/constants';
import { BrandController } from './brand.controller';

describe('BrandController routes', () => {
  it('exposes brands without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, BrandController)).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, BrandController.prototype.findBrands),
    ).toBe('brands');
    expect(
      Reflect.getMetadata(PATH_METADATA, BrandController.prototype.createBrand),
    ).toBe('brands');
  });
});
