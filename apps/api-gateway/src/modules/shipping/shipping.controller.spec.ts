import { PATH_METADATA } from '@nestjs/common/constants';
import { ShippingController } from './shipping.controller';

describe('ShippingController routes', () => {
  it('exposes shipping carriers without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ShippingController)).toBe('/');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ShippingController.prototype.findShippingCarriers,
      ),
    ).toBe('shipping-carriers');
  });
});
