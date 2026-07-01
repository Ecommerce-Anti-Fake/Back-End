import { validate } from 'class-validator';
import { SellerShopOrdersQueryDto } from './order-management.dto';

describe('SellerShopOrdersQueryDto', () => {
  it.each(['all', 'pending', 'paid', 'completed', 'cancelled', 'refunded'])(
    'accepts supported orderStatus value %s',
    async (orderStatus) => {
      const dto = Object.assign(new SellerShopOrdersQueryDto(), { orderStatus });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('rejects unsupported orderStatus values', async () => {
    const dto = Object.assign(new SellerShopOrdersQueryDto(), { orderStatus: 'shipping' });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'orderStatus',
          constraints: expect.objectContaining({ isIn: expect.any(String) }),
        }),
      ]),
    );
  });
});
