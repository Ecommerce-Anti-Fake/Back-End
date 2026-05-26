import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CreateRetailOrderUseCase } from './create-retail-order.use-case';

@Injectable()
export class CheckoutCartItemUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly createRetailOrderUseCase: CreateRetailOrderUseCase,
  ) {}

  async execute(input: {
    buyerUserId: string;
    cartItemId: string;
    paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS' | null;
    affiliateCode?: string | null;
    shippingName?: string | null;
    shippingPhone?: string | null;
    shippingAddress?: string | null;
    shippingDistrictId?: number | null;
    shippingDistrictName?: string | null;
    shippingWardCode?: string | null;
    shippingWardName?: string | null;
    shippingProviderCode?: string | null;
    shippingServiceId?: number | null;
    shippingServiceTypeId?: number | null;
  }) {
    const cartItem = await this.ordersRepository.findCartItemById(input.cartItemId);
    if (!cartItem || cartItem.cart.buyerUserId !== input.buyerUserId || cartItem.cart.cartStatus !== 'ACTIVE') {
      throw new NotFoundException('Cart item not found');
    }

    const order = await this.createRetailOrderUseCase.execute({
      buyerUserId: input.buyerUserId,
      offerId: cartItem.offerId,
      quantity: cartItem.quantity,
      paymentMethod: input.paymentMethod ?? 'COD',
      affiliateCode: input.affiliateCode ?? null,
      shippingName: input.shippingName ?? null,
      shippingPhone: input.shippingPhone ?? null,
      shippingAddress: input.shippingAddress ?? null,
      shippingDistrictId: input.shippingDistrictId ?? null,
      shippingDistrictName: input.shippingDistrictName ?? null,
      shippingWardCode: input.shippingWardCode ?? null,
      shippingWardName: input.shippingWardName ?? null,
      shippingProviderCode: input.shippingProviderCode ?? null,
      shippingServiceId: input.shippingServiceId ?? null,
      shippingServiceTypeId: input.shippingServiceTypeId ?? null,
    });

    await this.ordersRepository.removeCartItem({
      buyerUserId: input.buyerUserId,
      cartItemId: cartItem.id,
    });

    return order;
  }
}
