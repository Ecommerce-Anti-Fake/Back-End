import { BadRequestException, Injectable } from '@nestjs/common';
import { CartWithItems, CheckoutSessionRecord, OrderWithRelations, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { CreateOrderUseCase } from './create-order.use-case';
import { QuoteCartShippingOptionsUseCase } from './quote-cart-shipping-options.use-case';

type CheckoutCartInput = {
  buyerUserId: string;
  cartItemIds: string[];
  paymentMethod: 'COD' | 'PAYOS';
  shippingOptionCode: string;
  affiliateCode?: string | null;
};

type CheckoutCartShippingOption = {
  optionCode: string;
  providerCode: string;
  providerName: string;
  methodName: string;
  shippingFee: number;
  estimatedDelivery: string | null;
};

@Injectable()
export class CheckoutCartUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly quoteCartShippingOptionsUseCase: QuoteCartShippingOptionsUseCase,
    private readonly payOSPaymentService: PayOSPaymentService,
  ) {}

  async execute(input: CheckoutCartInput) {
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.buyerUserId);
    const selectedItems = this.selectCartItems(cart, input.cartItemIds);
    const shippingOption = await this.resolveShippingOption(input);
    const shipping = await this.resolveDefaultShipping(input.buyerUserId, shippingOption);

    if (input.paymentMethod === 'COD') {
      for (const item of selectedItems) {
        await this.createOrderFromCartItem({
          buyerUserId: input.buyerUserId,
          item,
          paymentMethod: 'COD',
          shippingProviderCode: shippingOption.providerCode,
          shipping,
          affiliateCode: input.affiliateCode ?? null,
        });
      }

      await this.ordersRepository.removeCartItems({
        buyerUserId: input.buyerUserId,
        cartItemIds: selectedItems.map((item) => item.id),
      });

      return { success: true };
    }

    const amount = this.resolvePayOSAmount(selectedItems, shippingOption);
    const session = await this.ordersRepository.createCheckoutSession({
      buyerUserId: input.buyerUserId,
      cartItemIds: selectedItems.map((item) => item.id),
      shippingOptionCode: input.shippingOptionCode,
      paymentMethod: 'PAYOS',
      amount,
    });

    const paymentLink = await this.payOSPaymentService.createPaymentLink({
      orderId: session.id,
      amount,
      description: `CK${session.id.replace(/-/g, '').slice(0, 7)}`,
      buyerName: shipping.shippingName,
      buyerPhone: shipping.shippingPhone,
      itemName: selectedItems.length === 1 ? selectedItems[0].offer.title : `${selectedItems.length} cart items`,
      quantity: selectedItems.reduce((total, item) => total + item.quantity, 0),
    });

    await this.ordersRepository.updateCheckoutSessionPaymentProviderRef({
      checkoutSessionId: session.id,
      paymentProviderRef: `PAYOS:${paymentLink.paymentLinkId}`,
    });

    return {
      checkoutSessionId: session.id,
      payOSCheckoutUrl: paymentLink.checkoutUrl,
    };
  }

  async completePayOSSession(input: {
    session: CheckoutSessionRecord;
    paymentProviderRef: string;
    reference: string;
  }) {
    if (input.session.paymentStatus === 'PAID') {
      return [];
    }

    const cartItemIds = this.readSessionCartItemIds(input.session);
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.session.buyerUserId);
    const selectedItems = this.selectCartItems(cart, cartItemIds);
    const shippingOption = await this.resolveShippingOption({
      buyerUserId: input.session.buyerUserId,
      cartItemIds,
      paymentMethod: 'PAYOS',
      shippingOptionCode: input.session.shippingOptionCode,
    });
    const shipping = await this.resolveDefaultShipping(input.session.buyerUserId, shippingOption);
    const orders: OrderWithRelations[] = [];

    for (const item of selectedItems) {
      const order = await this.createOrderFromCartItem({
        buyerUserId: input.session.buyerUserId,
        item,
        paymentMethod: 'PAYOS',
        shippingProviderCode: shippingOption.providerCode,
        shipping,
        affiliateCode: null,
        skipPayOSPaymentLink: true,
      });
      const paidOrder = await this.ordersRepository.markOrderPaid({
        id: order.id,
        actorUserId: input.session.buyerUserId,
        providerRef: `${input.paymentProviderRef}:${input.reference}`,
      });
      orders.push(paidOrder);
    }

    await this.ordersRepository.removeCartItems({
      buyerUserId: input.session.buyerUserId,
      cartItemIds,
    });
    await this.ordersRepository.markCheckoutSessionPaid(input.session.id);

    return orders;
  }

  private selectCartItems(cart: CartWithItems, cartItemIds: string[]) {
    const uniqueCartItemIds = [...new Set(cartItemIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueCartItemIds.length === 0) {
      throw new BadRequestException('At least one cart item is required for checkout');
    }

    const selectedItems = cart.items.filter((item) => uniqueCartItemIds.includes(item.id));
    if (selectedItems.length !== uniqueCartItemIds.length) {
      throw new BadRequestException('One or more cart items are invalid');
    }

    return selectedItems;
  }

  private async resolveShippingOption(input: CheckoutCartInput): Promise<CheckoutCartShippingOption> {
    const shippingOptions = await this.quoteCartShippingOptionsUseCase.execute({
      buyerUserId: input.buyerUserId,
      cartItemIds: input.cartItemIds,
    });
    const selected = shippingOptions.options.find((option) => option.optionCode === input.shippingOptionCode);
    if (!selected) {
      throw new BadRequestException('Shipping option is not available for selected cart items');
    }
    return selected;
  }

  private async resolveDefaultShipping(buyerUserId: string, shippingOption: CheckoutCartShippingOption) {
    const address = await this.ordersRepository.findDefaultAddressByUserId(buyerUserId);
    if (!address) {
      throw new BadRequestException('Default shipping address is required before checkout');
    }

    const carrierLocation = parseInternalAddressWardCode(address.wardCode);
    if (shippingOption.providerCode !== 'SELF_DELIVERY' && (!carrierLocation?.districtId || !carrierLocation.carrierWardCode)) {
      throw new BadRequestException('Default shipping address district and ward are required for selected shipping option');
    }

    return {
      shippingName: address.recipientName,
      shippingPhone: address.phone,
      shippingAddress: address.addressLine,
      shippingDistrictId: carrierLocation?.districtId ?? null,
      shippingDistrictName: null,
      shippingWardCode: carrierLocation?.carrierWardCode ?? null,
      shippingWardName: address.wardName ?? null,
    };
  }

  private createOrderFromCartItem(input: {
    buyerUserId: string;
    item: CartWithItems['items'][number];
    paymentMethod: 'COD' | 'PAYOS';
    shippingProviderCode: string;
    shipping: Awaited<ReturnType<CheckoutCartUseCase['resolveDefaultShipping']>>;
    affiliateCode?: string | null;
    skipPayOSPaymentLink?: boolean | null;
  }) {
    return this.createOrderUseCase.execute({
      buyerUserId: input.buyerUserId,
      offerId: input.item.offerId,
      quantity: input.item.quantity,
      paymentMethod: input.paymentMethod,
      affiliateCode: input.affiliateCode ?? null,
      shippingName: input.shipping.shippingName,
      shippingPhone: input.shipping.shippingPhone,
      shippingAddress: input.shipping.shippingAddress,
      shippingDistrictId: input.shipping.shippingDistrictId,
      shippingDistrictName: input.shipping.shippingDistrictName,
      shippingWardCode: input.shipping.shippingWardCode,
      shippingWardName: input.shipping.shippingWardName,
      shippingProviderCode: input.shippingProviderCode,
      shippingServiceId: null,
      shippingServiceTypeId: null,
      skipPayOSPaymentLink: input.skipPayOSPaymentLink ?? null,
    });
  }

  private resolvePayOSAmount(items: CartWithItems['items'], shippingOption: CheckoutCartShippingOption) {
    const subtotal = items.reduce((total, item) => total + Number(item.offer.price.toString()) * item.quantity, 0);
    return Math.round(subtotal + shippingOption.shippingFee);
  }

  private readSessionCartItemIds(session: CheckoutSessionRecord) {
    if (!Array.isArray(session.cartItemIds) || !session.cartItemIds.every((id) => typeof id === 'string')) {
      throw new BadRequestException('Checkout session cart items are invalid');
    }

    return session.cartItemIds;
  }
}

function parseInternalAddressWardCode(wardCode?: string | null) {
  const match = wardCode?.trim().match(/^VN-P(\d+)-D(\d+)-W(.+)$/);
  if (!match) {
    return null;
  }

  return {
    districtId: Number(match[2]),
    carrierWardCode: match[3],
  };
}
