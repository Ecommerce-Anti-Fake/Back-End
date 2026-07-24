import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CartWithItems, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import {
  CheckoutShippingOption,
  CheckoutShippingService,
  OrderNotificationService,
  OrderPlacementService,
  PayOSPaymentService,
} from '../services';
import { PayOrderByWalletUseCase } from './pay-order-by-wallet.use-case';
import { VoucherPricingService } from '../vouchers/voucher-pricing.service';

type CheckoutCartInput = {
  buyerUserId: string;
  cartItemIds: string[];
  paymentMethod: 'COD' | 'PAYOS' | 'WALLET';
  shippingOptionCode: string;
  affiliateCode?: string | null;
  requireAffiliateAttribution?: boolean;
  systemVoucherCode?: string | null;
  shopVouchers?: Array<{ shopId: string; voucherCode: string }>;
  shippingVouchers?: Array<{ shopId: string; voucherCode: string }>;
};

type CheckoutGroup = ReturnType<CheckoutCartUseCase['createShopGroups']>[number] & {
  voucherAllocations?: Array<{
    voucherId: string;
    productDiscountAmount: number;
    shippingDiscountAmount: number;
    eligibleBaseAmount: number;
    fundingSource: 'SYSTEM' | 'SHOP';
  }>;
};

type VoucherApplicationResult = {
  groups: CheckoutGroup[];
  voucherRedemptions: Array<{ voucherId: string; userId: string; idempotencyKey: string }>;
  affiliateItems: Array<{
    offerId: string;
    sellerShopId: string;
    brandId: string;
    grossAmount: number;
    shopProductDiscountAmount: number;
  }>;
};

@Injectable()
export class CheckoutCartUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderPlacementService: OrderPlacementService,
    private readonly checkoutShippingService: CheckoutShippingService,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly orderNotificationService: OrderNotificationService,
    private readonly payOrderByWalletUseCase: PayOrderByWalletUseCase,
    private readonly voucherPricingService: VoucherPricingService,
  ) {}

  async execute(input: CheckoutCartInput) {
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.buyerUserId);
    const selectedItems = await this.revalidateSelectedItems(
      this.selectCartItems(cart, input.cartItemIds),
    );
    const shippingOption = await this.resolveShippingOption(input, selectedItems);
    const shipping = await this.checkoutShippingService.resolveDefaultShipping(input.buyerUserId, shippingOption);
    const voucherResult = await this.applyVouchers(
      this.createShopGroups(selectedItems, shippingOption.shippingFee),
      input,
      selectedItems,
    );
    const groups = voucherResult.groups;
    const baseAmount = groups.reduce((total, group) => total + group.baseAmount, 0);
    const platformFeeAmount = groups.reduce((total, group) => total + group.platformFeeAmount, 0);
    const sellerReceivableAmount = groups.reduce((total, group) => total + group.sellerReceivableAmount, 0);
    const discountAmount = groups.reduce((total, group) => total + group.discountAmount, 0);
    const buyerPayableAmount = this.roundMoney(baseAmount + shippingOption.shippingFee - discountAmount);

    const orderInput = {
      buyerUserId: input.buyerUserId,
      legacyShopId: groups[0].shopId,
      paymentMethod: input.paymentMethod,
      baseAmount,
      discountAmount,
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
      voucherRedemptions: voucherResult.voucherRedemptions,
      affiliateAttribution: input.affiliateCode
        ? {
            affiliateCode: input.affiliateCode,
            required: input.requireAffiliateAttribution ?? false,
            customerUserId: input.buyerUserId,
            orderAmount: buyerPayableAmount,
            items: voucherResult.affiliateItems,
            fundingShopReceivables: groups.map((group) => ({
              shopId: group.shopId,
              amount: group.sellerReceivableAmount,
            })),
          }
        : undefined,
    };

    if (input.paymentMethod === 'WALLET') {
      const order = await this.ordersRepository.withSerializableTransaction(async (tx) => {
        const createdOrder = await this.orderPlacementService.createAggregateOrderInTransaction(tx, orderInput);
        await this.payOrderByWalletUseCase.executeInTransaction(tx, {
          orderId: createdOrder.id,
          requesterUserId: input.buyerUserId,
          amount: createdOrder.buyerPayableAmount,
        });
        await tx.cartItem.deleteMany({
          where: {
            id: { in: selectedItems.map((item) => item.id) },
            cart: { buyerUserId: input.buyerUserId },
          },
        });
        return createdOrder;
      });
      await this.orderNotificationService.notifyCreated(order);
      return { success: true, message: 'Đặt hàng và thanh toán bằng ví thành công.' };
    }

    const order = await this.orderPlacementService.createAggregateOrder(orderInput);
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
        discountAmount: 0,
        platformFeeAmount,
        sellerReceivableAmount: this.roundMoney(baseAmount - platformFeeAmount),
        shippingFeeAmount: groupShippingFee,
        parcelWeightGrams: hasCompleteParcel ? parcels.reduce((total, parcel) => total + Number(parcel.weight) * parcel.quantity, 0) : null,
        parcelLengthCm: hasCompleteParcel ? Math.max(...parcels.map((parcel) => Number(parcel.length))) : null,
        parcelWidthCm: hasCompleteParcel ? Math.max(...parcels.map((parcel) => Number(parcel.width))) : null,
        parcelHeightCm: hasCompleteParcel ? parcels.reduce((total, parcel) => total + Number(parcel.height) * parcel.quantity, 0) : null,
        items: shopItems.map((item) => ({
          sourceCartItemId: item.id,
          sourceLiveSessionId: item.sourceLiveSessionId ?? null,
          offerId: item.offerId,
          variantId: item.variantId ?? null,
          offerTitleSnapshot: item.offerTitleSnapshot,
          unitPrice: Number(item.unitPriceSnapshot.toString()),
          quantity: item.quantity,
          shopProductDiscountAmount: new Prisma.Decimal(0),
          systemProductDiscountAmount: new Prisma.Decimal(0),
          platformFeeAmount: new Prisma.Decimal(item.unitPriceSnapshot)
            .mul(item.quantity)
            .mul('0.2')
            .toDecimalPlaces(2),
          selectedOptions: item.variant?.values.map(({ optionValue }) => ({
            optionGroupId: optionValue.optionGroupId,
            optionValueId: optionValue.id,
            optionGroupDisplayName: optionValue.optionGroup.displayName,
            optionValueText: optionValue.text,
            mediaAssetId: optionValue.mediaAssetId,
            mediaUrl: optionValue.mediaAsset?.secureUrl ?? null,
          })),
        })),
      };
    });
  }

  async quote(input: Omit<CheckoutCartInput, 'paymentMethod' | 'affiliateCode'>) {
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.buyerUserId);
    const selectedItems = await this.revalidateSelectedItems(this.selectCartItems(cart, input.cartItemIds));
    const shippingOption = await this.resolveShippingOption(input, selectedItems);
    const voucherResult = await this.applyVouchers(this.createShopGroups(selectedItems, shippingOption.shippingFee), input, selectedItems);
    const discountAmount = voucherResult.groups.reduce((total, group) => total + group.discountAmount, 0);
    const baseAmount = voucherResult.groups.reduce((total, group) => total + group.baseAmount, 0);
    return {
      baseAmount,
      shippingFeeAmount: shippingOption.shippingFee,
      discountAmount,
      buyerPayableAmount: this.roundMoney(baseAmount + shippingOption.shippingFee - discountAmount),
      groups: voucherResult.groups.map((group) => ({
        shopId: group.shopId,
        baseAmount: group.baseAmount,
        discountAmount: group.discountAmount,
        shippingFeeAmount: group.shippingFeeAmount,
        sellerReceivableAmount: group.sellerReceivableAmount,
      })),
    };
  }

  private async applyVouchers(groups: ReturnType<CheckoutCartUseCase['createShopGroups']>, input: Omit<CheckoutCartInput, 'paymentMethod' | 'affiliateCode'>, selectedItems: CartWithItems['items']): Promise<VoucherApplicationResult> {
    if (!input.systemVoucherCode && !(input.shopVouchers?.length) && !(input.shippingVouchers?.length)) {
      return {
        groups,
        voucherRedemptions: [],
        affiliateItems: selectedItems.map((item) => ({
          offerId: item.offerId,
          sellerShopId: item.offer.shopId,
          brandId: item.offer.brandId,
          grossAmount: Number(item.unitPriceSnapshot.toString()) * item.quantity,
          shopProductDiscountAmount: 0,
        })),
      };
    }
    const vouchers = await this.ordersRepository.findCheckoutVouchers({
      systemVoucherCode: input.systemVoucherCode,
      shopVoucherCodes: input.shopVouchers?.map((voucher) => voucher.voucherCode),
      shippingVoucherCodes: input.shippingVouchers?.map((voucher) => voucher.voucherCode),
    });
    const findCode = (code?: string | null) => vouchers.find((voucher) => voucher.code === code?.trim().toUpperCase());
    for (const voucher of vouchers) {
      const usage = await this.ordersRepository.getVoucherUsage(voucher.id, input.buyerUserId);
      if (voucher.totalUsageLimit !== null && usage.total >= voucher.totalUsageLimit) {
        throw new BadRequestException(`Voucher ${voucher.code} đã hết lượt sử dụng`);
      }
      if (voucher.userUsageLimit !== null && usage.user >= voucher.userUsageLimit) {
        throw new BadRequestException(`Bạn đã sử dụng voucher ${voucher.code} đủ số lần`);
      }
    }
    const systemVoucher = findCode(input.systemVoucherCode);
    if (input.systemVoucherCode && (!systemVoucher || systemVoucher.ownerType !== 'SYSTEM')) {
      throw new BadRequestException('Voucher hệ thống không hợp lệ hoặc đã hết hạn');
    }

    const eligibleItemsForVoucher = (voucher: typeof systemVoucher, shopId?: string) => selectedItems.filter((item) => {
      if (shopId && item.offer.shopId !== shopId) return false;
      if (!voucher || voucher.scopeType === 'ALL') return true;
      if (voucher.scopeType === 'SHOP') return voucher.ownerType === 'SHOP' ? item.offer.shopId === voucher.shopId : voucher.scopeIds.includes(item.offer.shopId);
      if (voucher.scopeType === 'OFFER') return voucher.scopeIds.includes(item.offerId);
      if (voucher.scopeType === 'VARIANT') return Boolean(item.variantId && voucher.scopeIds.includes(item.variantId));
      return false;
    });
    const eligibleBaseForGroup = (voucher: typeof systemVoucher, group: { shopId: string }) => eligibleItemsForVoucher(voucher, group.shopId)
      .reduce((sum, item) => sum + Number(item.unitPriceSnapshot.toString()) * item.quantity, 0);

    const shopDiscounts = groups.map((group) => {
      const selection = input.shopVouchers?.find((voucher) => voucher.shopId === group.shopId);
      const voucher = findCode(selection?.voucherCode);
      if (selection && (!voucher || voucher.ownerType !== 'SHOP' || voucher.shopId !== group.shopId)) {
        throw new BadRequestException('Voucher shop không hợp lệ');
      }
      const eligibleBase = eligibleBaseForGroup(voucher, group);
      if (voucher && eligibleBase <= 0) throw new BadRequestException('Voucher khÃ´ng Ã¡p dá»¥ng cho sáº£n pháº©m Ä‘Ã£ chá»n');
      return voucher?.discountType === 'FREE_SHIPPING'
        ? new Prisma.Decimal(0)
        : voucher
          ? this.voucherPricingService.calculateProductDiscount(voucher, new Prisma.Decimal(eligibleBase))
          : new Prisma.Decimal(0);
    });
    const eligibleAmounts = groups.map((group, index) => {
      const eligibleBase = eligibleBaseForGroup(systemVoucher, group);
      return new Prisma.Decimal(eligibleBase).minus(shopDiscounts[index]);
    });
    const systemDiscount = systemVoucher
      ? this.voucherPricingService.calculateProductDiscount(systemVoucher, eligibleAmounts.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0)))
      : new Prisma.Decimal(0);
    const systemAllocations = this.voucherPricingService.allocateSystemDiscount(eligibleAmounts, systemDiscount);

    const resultGroups = groups.map((group, index) => {
      const shopSelection = input.shopVouchers?.find((voucher) => voucher.shopId === group.shopId);
      const shopVoucher = findCode(shopSelection?.voucherCode);
      const shippingSelection = input.shippingVouchers?.find((voucher) => voucher.shopId === group.shopId);
      const shippingVoucher = findCode(shippingSelection?.voucherCode);
      if (shippingSelection && (!shippingVoucher || shippingVoucher.ownerType !== 'SHOP' || shippingVoucher.shopId !== group.shopId || shippingVoucher.discountType !== 'FREE_SHIPPING')) {
        throw new BadRequestException('Voucher vận chuyển không hợp lệ');
      }
      const shopShippingDiscount = shippingVoucher
        ? this.voucherPricingService.calculateShippingDiscount(shippingVoucher, new Prisma.Decimal(group.shippingFeeAmount), new Prisma.Decimal(group.baseAmount))
        : new Prisma.Decimal(0);
      const systemShippingDiscount = systemVoucher?.discountType === 'FREE_SHIPPING'
        ? this.voucherPricingService.calculateShippingDiscount(systemVoucher, new Prisma.Decimal(group.shippingFeeAmount), new Prisma.Decimal(eligibleBaseForGroup(systemVoucher, group)))
        : new Prisma.Decimal(0);
      const pricing = this.voucherPricingService.calculateGroup({
        grossAmount: new Prisma.Decimal(group.baseAmount),
        shippingFee: new Prisma.Decimal(group.shippingFeeAmount),
        shopProductDiscount: shopDiscounts[index],
        systemProductDiscount: systemAllocations[index],
        shippingDiscount: shopShippingDiscount.plus(systemShippingDiscount),
        shopShippingDiscount,
        commissionRate: new Prisma.Decimal('0.2'),
      });
      return {
        ...group,
        discountAmount: Number(shopDiscounts[index].plus(systemAllocations[index]).plus(shopShippingDiscount).plus(systemShippingDiscount)),
        platformFeeAmount: Number(pricing.platformFee),
        sellerReceivableAmount: Number(pricing.sellerReceivable),
        voucherAllocations: [
          ...(shopVoucher ? [{ voucherId: shopVoucher.id, productDiscountAmount: Number(shopDiscounts[index]), shippingDiscountAmount: Number(shopShippingDiscount), eligibleBaseAmount: group.baseAmount, fundingSource: 'SHOP' as const }] : []),
          ...(systemVoucher && systemAllocations[index].gt(0) ? [{ voucherId: systemVoucher.id, productDiscountAmount: Number(systemAllocations[index]), shippingDiscountAmount: 0, eligibleBaseAmount: Number(eligibleAmounts[index]), fundingSource: 'SYSTEM' as const }] : []),
          ...(systemVoucher?.discountType === 'FREE_SHIPPING' ? [{ voucherId: systemVoucher.id, productDiscountAmount: 0, shippingDiscountAmount: Number(systemShippingDiscount), eligibleBaseAmount: group.shippingFeeAmount, fundingSource: 'SYSTEM' as const }] : []),
        ],
      };
    });
    const redemptionVoucherIds = new Set<string>();
    resultGroups.forEach((group) => group.voucherAllocations?.forEach((allocation) => redemptionVoucherIds.add(allocation.voucherId)));
    const shopDiscountByItemId = new Map<string, Prisma.Decimal>();
    groups.forEach((group, index) => {
      const selection = input.shopVouchers?.find((voucher) => voucher.shopId === group.shopId);
      const shopVoucher = findCode(selection?.voucherCode);
      const eligibleItems = eligibleItemsForVoucher(shopVoucher, group.shopId);
      const allocations = this.voucherPricingService.allocateSystemDiscount(
        eligibleItems.map(
          (item) => new Prisma.Decimal(item.unitPriceSnapshot).mul(item.quantity),
        ),
        shopDiscounts[index],
      );
      eligibleItems.forEach((item, itemIndex) => {
        shopDiscountByItemId.set(item.id, allocations[itemIndex]);
      });
    });
    const systemDiscountByItemId = new Map<string, Prisma.Decimal>();
    groups.forEach((group, index) => {
      const eligibleItems = eligibleItemsForVoucher(systemVoucher, group.shopId);
      const allocations = this.voucherPricingService.allocateSystemDiscount(
        eligibleItems.map((item) =>
          Prisma.Decimal.max(
            new Prisma.Decimal(0),
            new Prisma.Decimal(item.unitPriceSnapshot)
              .mul(item.quantity)
              .minus(shopDiscountByItemId.get(item.id) ?? 0),
          ),
        ),
        systemAllocations[index],
      );
      eligibleItems.forEach((item, itemIndex) => {
        systemDiscountByItemId.set(item.id, allocations[itemIndex]);
      });
    });
    const financialGroups = resultGroups.map((group) => {
      const commissionBases = group.items.map((item) =>
        Prisma.Decimal.max(
          new Prisma.Decimal(0),
          new Prisma.Decimal(item.unitPrice)
            .mul(item.quantity)
            .minus(shopDiscountByItemId.get(item.sourceCartItemId) ?? 0),
        ),
      );
      const platformFees = this.voucherPricingService.allocateSystemDiscount(
        commissionBases,
        new Prisma.Decimal(group.platformFeeAmount),
      );
      return {
        ...group,
        items: group.items.map((item, itemIndex) => ({
          ...item,
          shopProductDiscountAmount:
            shopDiscountByItemId.get(item.sourceCartItemId) ?? new Prisma.Decimal(0),
          systemProductDiscountAmount:
            systemDiscountByItemId.get(item.sourceCartItemId) ?? new Prisma.Decimal(0),
          platformFeeAmount: platformFees[itemIndex],
        })),
      };
    });
    return {
      groups: financialGroups,
      voucherRedemptions: [...redemptionVoucherIds].map((voucherId) => ({
        voucherId,
        userId: input.buyerUserId,
        idempotencyKey: `VOUCHER:${voucherId}:BUYER:${input.buyerUserId}:${input.cartItemIds.slice().sort().join(',')}`,
      })),
      affiliateItems: selectedItems.map((item) => ({
        offerId: item.offerId,
        sellerShopId: item.offer.shopId,
        brandId: item.offer.brandId,
        grossAmount: Number(item.unitPriceSnapshot.toString()) * item.quantity,
        shopProductDiscountAmount: Number(
          (shopDiscountByItemId.get(item.id) ?? new Prisma.Decimal(0)).toString(),
        ),
      })),
    };
  }

  private selectCartItems(cart: CartWithItems, cartItemIds: string[]) {
    const uniqueCartItemIds = [...new Set(cartItemIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueCartItemIds.length === 0) throw new BadRequestException('At least one cart item is required for checkout');
    const selectedItems = cart.items.filter((item) => uniqueCartItemIds.includes(item.id));
    if (selectedItems.length !== uniqueCartItemIds.length) throw new BadRequestException('One or more cart items are invalid');
    return selectedItems;
  }

  private async revalidateSelectedItems(items: CartWithItems['items']) {
    const refreshed: CartWithItems['items'] = [];
    for (const item of items) {
      const offer = await this.ordersRepository.findCurrentOfferForCart(item.offerId);
      if (!offer || offer.offerStatus !== 'active') {
        throw new BadRequestException('Offer is not available');
      }

      if (!item.variantId) {
        throw new BadRequestException('Variant is required for this offer');
      }
      let currentPrice = 0;
      if (item.variantId) {
        const variant = await this.ordersRepository.findOfferVariantForCart({
          offerId: item.offerId,
          variantId: item.variantId,
        });
        if (!variant || !variant.isActive || (variant.values ?? []).some(({ optionValue }) => !optionValue.isVisible)) {
          throw new BadRequestException('Variant is not available');
        }
        if (item.quantity > variant.availableQuantity) {
          throw new BadRequestException('Quantity exceeds available stock');
        }
        if (variant.price === null) {
          throw new BadRequestException('Variant price is not configured');
        }
        currentPrice = Number(variant.price.toString());
      }

      refreshed.push({
        ...item,
        offer: { ...item.offer, ...offer },
        unitPriceSnapshot: new Prisma.Decimal(currentPrice),
      });
    }
    return refreshed as CartWithItems['items'];
  }

  private async resolveShippingOption(input: Pick<CheckoutCartInput, 'buyerUserId' | 'shippingOptionCode'>, selectedItems: CartWithItems['items']): Promise<CheckoutShippingOption> {
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
