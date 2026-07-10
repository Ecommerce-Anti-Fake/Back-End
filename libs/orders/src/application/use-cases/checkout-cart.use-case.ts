import { BadRequestException, Injectable } from '@nestjs/common';
import { CartWithItems, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import {
  CheckoutShippingOption,
  CheckoutShippingService,
  OrderNotificationService,
  OrderPlacementService,
  PayOSPaymentService,
} from '../services';

type CheckoutCartInput = {
  buyerUserId: string;
  cartItemIds: string[];
  paymentMethod: 'COD' | 'PAYOS';
  shippingOptionCode: string;
  affiliateCode?: string | null;
};

@Injectable()
export class CheckoutCartUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderPlacementService: OrderPlacementService,
    private readonly checkoutShippingService: CheckoutShippingService,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly orderNotificationService: OrderNotificationService,
  ) {}

  async execute(input: CheckoutCartInput) {
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.buyerUserId);
    const selectedItems = this.selectCartItems(cart, input.cartItemIds);
    const shippingOption = await this.resolveShippingOption(input, selectedItems);
    const shipping = await this.checkoutShippingService.resolveDefaultShipping(input.buyerUserId, shippingOption);
    const groups = this.createShopGroups(selectedItems, shippingOption.shippingFee);
    if (input.affiliateCode && selectedItems.length !== 1) {
      throw new BadRequestException('Affiliate checkout currently requires exactly one cart item');
    }
    const baseAmount = groups.reduce((total, group) => total + group.baseAmount, 0);
    const platformFeeAmount = groups.reduce((total, group) => total + group.platformFeeAmount, 0);
    const sellerReceivableAmount = groups.reduce((total, group) => total + group.sellerReceivableAmount, 0);
    const buyerPayableAmount = this.roundMoney(baseAmount + shippingOption.shippingFee);

    const order = await this.orderPlacementService.createAggregateOrder({
      buyerUserId: input.buyerUserId,
      legacyShopId: groups[0].shopId,
      paymentMethod: input.paymentMethod,
      baseAmount,
      platformFeeAmount,
      buyerPayableAmount,
      sellerReceivableAmount,
      shippingFeeAmount: shippingOption.shippingFee,
      shipping: {
        ...shipping,
        providerCode: shippingOption.providerCode,
        providerName: shippingOption.providerName,
      },
      groups,
      affiliateAttribution: input.affiliateCode
        ? {
            affiliateCode: input.affiliateCode,
            customerUserId: input.buyerUserId,
            offerId: selectedItems[0].offerId,
            sellerShopId: selectedItems[0].offer.shopId,
            brandId: selectedItems[0].offer.brandId,
            orderAmount: buyerPayableAmount,
            commissionBase: platformFeeAmount,
          }
        : undefined,
    });
    await this.orderNotificationService.notifyCreated(order);

    if (input.paymentMethod === 'COD') {
      await this.ordersRepository.removeCartItems({
        buyerUserId: input.buyerUserId,
        cartItemIds: selectedItems.map((item) => item.id),
      });
      return { success: true, orderId: order.id };
    }

    let paymentLink: Awaited<ReturnType<PayOSPaymentService['createPaymentLink']>>;
    try {
      paymentLink = await this.payOSPaymentService.createPaymentLink({
        orderId: order.id,
        amount: buyerPayableAmount,
        description: `DH${order.id.replace(/-/g, '').slice(0, 7)}`,
        buyerName: shipping.name,
        buyerPhone: shipping.phone,
        itemName: selectedItems.length === 1 ? selectedItems[0].offer.title : `${selectedItems.length} cart items`,
        quantity: selectedItems.reduce((total, item) => total + item.quantity, 0),
      });
    } catch (error) {
      await this.ordersRepository.markOrderPaymentFailed({
        id: order.id,
        actorUserId: input.buyerUserId,
        providerRef: null,
        reason: 'Unable to create payOS payment link',
      });
      throw error;
    }
    await this.ordersRepository.updatePaymentProviderRef(order.id, `PAYOS:${paymentLink.paymentLinkId}`);

    return {
      orderId: order.id,
      orderCode: paymentLink.orderCode,
      paymentLinkId: paymentLink.paymentLinkId,
      checkoutUrl: paymentLink.checkoutUrl,
    };
  }

  private createShopGroups(items: CartWithItems['items'], shippingFee: number) {
    const grouped = new Map<string, CartWithItems['items']>();
    for (const item of items) {
      const shopItems = grouped.get(item.offer.shopId) ?? [];
      shopItems.push(item);
      grouped.set(item.offer.shopId, shopItems);
    }

    const subtotal = items.reduce((total, item) => total + Number(item.unitPriceSnapshot.toString()) * item.quantity, 0);
    let allocatedShipping = 0;
    return Array.from(grouped.entries()).map(([shopId, shopItems], index, allGroups) => {
      const baseAmount = this.roundMoney(
        shopItems.reduce((total, item) => total + Number(item.unitPriceSnapshot.toString()) * item.quantity, 0),
      );
      const shippingRatio = subtotal > 0 ? baseAmount / subtotal : 1 / allGroups.length;
      const groupShippingFee =
        index === allGroups.length - 1
          ? this.roundMoney(shippingFee - allocatedShipping)
          : this.roundMoney(shippingFee * shippingRatio);
      allocatedShipping = this.roundMoney(allocatedShipping + groupShippingFee);
      const platformFeeAmount = this.roundMoney(baseAmount * 0.2);
      const parcels = shopItems.map((item) => ({
        weight: item.offer.parcelWeightGrams,
        length: item.offer.parcelLengthCm,
        width: item.offer.parcelWidthCm,
        height: item.offer.parcelHeightCm,
        quantity: item.quantity,
      }));
      const hasCompleteParcel = parcels.every((parcel) => parcel.weight && parcel.length && parcel.width && parcel.height);
      return {
        shopId,
        baseAmount,
        platformFeeAmount,
        sellerReceivableAmount: this.roundMoney(baseAmount - platformFeeAmount),
        shippingFeeAmount: groupShippingFee,
        parcelWeightGrams: hasCompleteParcel ? parcels.reduce((total, parcel) => total + Number(parcel.weight) * parcel.quantity, 0) : null,
        parcelLengthCm: hasCompleteParcel ? Math.max(...parcels.map((parcel) => Number(parcel.length))) : null,
        parcelWidthCm: hasCompleteParcel ? Math.max(...parcels.map((parcel) => Number(parcel.width))) : null,
        parcelHeightCm: hasCompleteParcel ? parcels.reduce((total, parcel) => total + Number(parcel.height) * parcel.quantity, 0) : null,
        items: shopItems.map((item) => ({
          sourceCartItemId: item.id,
          offerId: item.offerId,
          variantId: item.variantId ?? null,
          offerTitleSnapshot: item.offerTitleSnapshot,
          unitPrice: Number(item.unitPriceSnapshot.toString()),
          quantity: item.quantity,
        })),
      };
    });
  }

  private selectCartItems(cart: CartWithItems, cartItemIds: string[]) {
    const uniqueCartItemIds = [...new Set(cartItemIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueCartItemIds.length === 0) throw new BadRequestException('At least one cart item is required for checkout');
    const selectedItems = cart.items.filter((item) => uniqueCartItemIds.includes(item.id));
    if (selectedItems.length !== uniqueCartItemIds.length) throw new BadRequestException('One or more cart items are invalid');
    return selectedItems;
  }

  private async resolveShippingOption(input: CheckoutCartInput, selectedItems: CartWithItems['items']): Promise<CheckoutShippingOption> {
    return this.checkoutShippingService.resolveSelectedOption({
      buyerUserId: input.buyerUserId,
      shippingOptionCode: input.shippingOptionCode,
      items: selectedItems.map((item) => ({
        offerId: item.offerId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPriceSnapshot.toString()),
        offer: item.offer,
      })),
    });
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
