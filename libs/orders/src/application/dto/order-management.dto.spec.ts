import { validate } from 'class-validator';
import { SellerShopOrdersQueryDto } from './order-management.dto';

describe('SellerShopOrdersQueryDto', () => {
  it.each(['all', 'PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'])(
    'accepts supported fulfillment status value %s',
    async (status) => {
      const dto = Object.assign(new SellerShopOrdersQueryDto(), { status });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('rejects unsupported fulfillment status values', async () => {
    const dto = Object.assign(new SellerShopOrdersQueryDto(), { status: 'paid' });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'status',
          constraints: expect.objectContaining({ isIn: expect.any(String) }),
        }),
      ]),
    );
  });
});
