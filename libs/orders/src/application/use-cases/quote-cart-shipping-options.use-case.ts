import { BadRequestException, Injectable } from '@nestjs/common';
import { CartWithItems, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CheckoutShippingService } from '../services';

@Injectable()
export class QuoteCartShippingOptionsUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly checkoutShippingService: CheckoutShippingService,
  ) {}

  async execute(input: {
    buyerUserId: string;
    cartItemIds: string[];
  }): Promise<CartShippingOptionsResponse> {
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.buyerUserId);
    const selectedItems = this.selectCartItems(cart, input.cartItemIds);
    const result = await this.checkoutShippingService.quoteOptionsForItems({
      buyerUserId: input.buyerUserId,
      items: selectedItems.map((item) => ({
        offerId: item.offerId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPriceSnapshot.toString()),
        offer: item.offer,
      })),
    });

    return {
      options: this.checkoutShippingService.toPublicOptions(result.options),
    };
  }

  private selectCartItems(cart: CartWithItems, cartItemIds: string[]) {
    const uniqueCartItemIds = [...new Set(cartItemIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueCartItemIds.length === 0) {
      throw new BadRequestException('At least one cart item is required for shipping quote');
    }

    const selectedItems = cart.items.filter((item) => uniqueCartItemIds.includes(item.id));
    if (selectedItems.length !== uniqueCartItemIds.length) {
      throw new BadRequestException('One or more cart items are invalid');
    }

    return selectedItems;
  }
}

type CartShippingOption = {
  optionCode: string;
  providerCode: string;
  providerName: string;
  methodName: string;
  shippingFee: number;
  estimatedDelivery: string | null;
};

type CartShippingOptionsResponse = {
  options: CartShippingOption[];
};
