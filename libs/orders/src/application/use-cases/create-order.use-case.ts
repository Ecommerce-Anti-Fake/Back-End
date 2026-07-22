import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OfferForOrdering, OfferVariantForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { WholesalePricingPort } from '../ports';
import { OrderNotificationService, OrderPlacementService, PayOSPaymentService, ShippingCarrierAdapterService } from '../services';
import { toOrderResponse } from './orders.mapper';
import { PayOrderByWalletUseCase } from './pay-order-by-wallet.use-case';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderPlacementService: OrderPlacementService,
    @Inject(WholesalePricingPort) private readonly wholesalePricingPort: WholesalePricingPort,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService,
    private readonly orderNotificationService: OrderNotificationService,
    private readonly payOrderByWalletUseCase: PayOrderByWalletUseCase,
  ) {}

  async execute(input: {
    buyerUserId: string;
    buyerShopId?: string | null;
    buyerDistributionNodeId?: string | null;
    offerId: string;
    variantId?: string | null;
    quantity: number;
    paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS' | 'WALLET' | null;
    affiliateCode?: string | null;
    requireAffiliateAttribution?: boolean;
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
    skipPayOSPaymentLink?: boolean | null;
    systemVoucherCode?: string | null;
    shopVoucherCode?: string | null;
    shippingVoucherCode?: string | null;
    voucherPricingOverride?: {
      discountAmount: number;
      productPayableAmount: number;
      platformFeeAmount: number;
      sellerReceivableAmount: number;
    };
    voucherRedemptions?: Array<{ voucherId: string; userId: string; idempotencyKey: string }>;
    voucherAllocations?: Array<{
      voucherId: string;
      productDiscountAmount: number;
      shippingDiscountAmount: number;
      eligibleBaseAmount: number;
      fundingSource: 'SYSTEM' | 'SHOP';
    }>;
  }) {
    const buyer = await this.ordersRepository.findUserById(input.buyerUserId);
    if (!buyer) throw new NotFoundException('Buyer not found');

    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.offerStatus !== 'active') throw new BadRequestException('Only active offers can be ordered');
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    const variant = await this.resolveVariant(input, offer);
    if (!variant) {
      throw new BadRequestException('Variant is required for this offer');
    }
    const availableQuantity = variant.availableQuantity;
    if (input.quantity > availableQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    await this.validateBuyerContext(input, offer);
    if (offer.shop.registrationType === 'DISTRIBUTOR') {
      const allocated = await this.ordersRepository.getOfferAllocatedBatchQuantity(offer.id);
      if (allocated < input.quantity) {
        throw new BadRequestException('Quantity exceeds allocated resale batch stock');
      }
    }

    const shipping = this.resolveShippingSnapshot(input, buyer);
    const shippingMethod = await this.resolveShippingMethod(input.shippingProviderCode);
    const parcel = this.resolveShippingParcel(offer, shippingMethod.providerCode);
    const pricing = await this.resolvePricing(input, offer, variant);
    const quote = await this.shippingCarrierAdapterService.quoteShipment({
      providerCode: shippingMethod.providerCode,
      shippingName: shipping.name,
      shippingPhone: shipping.phone,
      shippingAddress: shipping.address,
      shippingDistrictId: shipping.districtId,
      shippingWardCode: shipping.wardCode,
      shippingServiceId: input.shippingServiceId ?? null,
      shippingServiceTypeId: input.shippingServiceTypeId ?? null,
      ...parcel,
      itemName: offer.title,
      declaredValue: pricing.baseAmount,
      fallbackFee: Number(shippingMethod.shippingFee.toString()),
    });
    const shippingFeeAmount = this.roundMoney(quote.shippingFeeAmount);
    const finalPricing = input.voucherPricingOverride
      ? {
          ...pricing,
          discountAmount: input.voucherPricingOverride.discountAmount,
          platformFeeAmount: input.voucherPricingOverride.platformFeeAmount,
          sellerReceivableAmount: input.voucherPricingOverride.sellerReceivableAmount,
          buyerPayableAmount: input.voucherPricingOverride.productPayableAmount,
        }
      : pricing;
    const buyerPayableAmount = this.roundMoney(finalPricing.buyerPayableAmount + shippingFeeAmount);
    const paymentMethod = input.paymentMethod ?? 'COD';
    const shopProductDiscountAmount = (input.voucherAllocations ?? [])
      .filter((allocation) => allocation.fundingSource === 'SHOP')
      .reduce(
        (total, allocation) => total.plus(allocation.productDiscountAmount),
        new Prisma.Decimal(0),
      );
    const systemProductDiscountAmount = (input.voucherAllocations ?? [])
      .filter((allocation) => allocation.fundingSource === 'SYSTEM')
      .reduce(
        (total, allocation) => total.plus(allocation.productDiscountAmount),
        new Prisma.Decimal(0),
      );

    const order = await this.orderPlacementService.createOrder({
      order: {
        buyerUserId: input.buyerUserId,
        buyerShopId: input.buyerShopId ?? null,
        buyerDistributionNodeId: pricing.buyerDistributionNodeId,
        shopId: offer.shopId,
        orderStatus: 'pending',
        baseAmount: pricing.baseAmount,
        discountAmount: finalPricing.discountAmount,
        platformFeeAmount: finalPricing.platformFeeAmount,
        buyerPayableAmount,
        sellerReceivableAmount: finalPricing.sellerReceivableAmount,
        totalAmount: buyerPayableAmount,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingAddress: shipping.address,
        shippingDistrictId: shipping.districtId,
        shippingDistrictName: shipping.districtName,
        shippingWardCode: shipping.wardCode,
        shippingWardName: shipping.wardName,
        shippingProviderCode: shippingMethod.providerCode,
        shippingProviderName: shippingMethod.providerName,
        shippingServiceId: quote.serviceId,
        shippingServiceTypeId: quote.serviceTypeId,
        shippingFeeAmount,
        ...parcel,
        paymentMethod,
        voucherRedemptions: input.voucherRedemptions,
        voucherAllocations: input.voucherAllocations,
        item: {
          offerId: offer.id,
          variantId: variant?.id ?? null,
          offerTitleSnapshot: offer.title,
          unitPrice: finalPricing.unitPrice,
          quantity: input.quantity,
          shopProductDiscountAmount,
          systemProductDiscountAmount,
          platformFeeAmount: finalPricing.platformFeeAmount,
          selectedOptions: (variant?.values ?? []).map(({ optionValue }) => ({
            optionGroupId: optionValue.optionGroupId,
            optionValueId: optionValue.id,
            optionGroupDisplayName: optionValue.optionGroup.displayName,
            optionValueText: optionValue.text,
            mediaAssetId: optionValue.mediaAssetId,
            mediaUrl: optionValue.mediaAsset?.secureUrl ?? null,
          })),
        },
      },
      affiliateAttribution: input.affiliateCode
        ? {
            affiliateCode: input.affiliateCode,
            required: input.requireAffiliateAttribution ?? false,
            customerUserId: input.buyerUserId,
            orderAmount: buyerPayableAmount,
            items: [
              {
                offerId: offer.id,
                sellerShopId: offer.shopId,
                brandId: offer.brandId,
                grossAmount: pricing.baseAmount,
                shopProductDiscountAmount,
              },
            ],
            fundingShopReceivables: [
              {
                shopId: offer.shopId,
                amount: finalPricing.sellerReceivableAmount,
              },
            ],
          }
        : undefined,
    });
    await this.orderNotificationService.notifyCreated(order);

    const response = toOrderResponse(order);
    if (paymentMethod === 'WALLET') {
      await this.payOrderByWalletUseCase.execute({
        orderId: order.id,
        requesterUserId: input.buyerUserId,
        amount: order.buyerPayableAmount,
      });
      return { success: true, message: 'Thanh toán đơn hàng bằng ví thành công.' };
    }
    if (paymentMethod !== 'PAYOS' || input.skipPayOSPaymentLink) return response;

    const paymentLink = await this.payOSPaymentService.createPaymentLink({
      orderId: order.id,
      amount: buyerPayableAmount,
      description: `DH${order.id.replace(/-/g, '').slice(0, 7)}`,
      buyerName: shipping.name,
      buyerPhone: shipping.phone,
      itemName: offer.title,
      quantity: input.quantity,
    });
    await this.ordersRepository.updatePaymentProviderRef(order.id, `PAYOS:${paymentLink.paymentLinkId}`);
    return {
      ...response,
      paymentProviderRef: `PAYOS:${paymentLink.paymentLinkId}`,
      payOSOrderCode: paymentLink.orderCode,
      payOSPaymentLinkId: paymentLink.paymentLinkId,
      payOSCheckoutUrl: paymentLink.checkoutUrl,
      payOSQrCode: paymentLink.qrCode ?? null,
    };
  }

  private async validateBuyerContext(input: { buyerUserId: string; buyerShopId?: string | null; buyerDistributionNodeId?: string | null }, offer: OfferForOrdering) {
    if (input.buyerDistributionNodeId && !input.buyerShopId) {
      throw new BadRequestException('Buyer shop is required when buyer distribution node is provided');
    }
    if (!input.buyerShopId) return;
    const shop = await this.ordersRepository.findOwnedShop(input.buyerShopId, input.buyerUserId);
    if (!shop) throw new BadRequestException('Buyer shop does not belong to current user');
    if (shop.shopStatus !== 'verified') throw new BadRequestException('Buyer shop must be active before creating orders');
    if (offer.shopId === input.buyerShopId) throw new BadRequestException('Buyer shop cannot order its own offer');
  }

  private async resolveVariant(input: { variantId?: string | null }, offer: OfferForOrdering) {
    const variantId = input.variantId?.trim() || null;
    if (!variantId) {
      const variantCount = await this.ordersRepository.countOfferVariants(offer.id);
      if (variantCount > 0) {
        throw new BadRequestException('Variant is required for this offer');
      }
      return null;
    }

    const variant = await this.ordersRepository.findOfferVariantForOrdering({
      offerId: offer.id,
      variantId,
    });
    if (!variant || !variant.isActive || (variant.values ?? []).some((value) => !value.optionValue.isVisible)) {
      throw new BadRequestException('Variant is not available');
    }
    return variant;
  }

  private async resolvePricing(
    input: { buyerShopId?: string | null; buyerDistributionNodeId?: string | null; quantity: number },
    offer: OfferForOrdering,
    variant: OfferVariantForOrdering | null,
  ) {
    if (input.buyerShopId && input.buyerDistributionNodeId) {
      const pricing = await this.wholesalePricingPort.resolve({
        buyerShopId: input.buyerShopId,
        buyerDistributionNodeId: input.buyerDistributionNodeId,
        offer,
        variantPrice: variant!.price!,
        quantity: input.quantity,
      });
      if (offer.distributionNode && !pricing.isInNetworkTrade) {
        throw new BadRequestException('Distribution checkout must use in-network pricing');
      }
      return pricing;
    }
    if (!variant || variant.price === null) {
      throw new BadRequestException('Variant price is not configured');
    }
    const unitPrice = Number(variant.price.toString());
    const baseAmount = this.roundMoney(unitPrice * input.quantity);
    const platformFeeAmount = this.roundMoney(baseAmount * 0.2);
    return {
      buyerDistributionNodeId: null,
      unitPrice,
      baseAmount,
      discountAmount: 0,
      platformFeeAmount,
      buyerPayableAmount: baseAmount,
      sellerReceivableAmount: this.roundMoney(baseAmount - platformFeeAmount),
    };
  }

  private resolveShippingSnapshot(input: any, buyer: { displayName: string | null; phone: string | null }) {
    const phone = input.shippingPhone?.trim() || buyer.phone?.trim() || null;
    const address = input.shippingAddress?.trim() || null;
    if (!phone) throw new BadRequestException('Vui lòng bổ sung số điện thoại nhận hàng trước khi tạo đơn.');
    if (!address) throw new BadRequestException('Vui lòng bổ sung địa chỉ nhận hàng trước khi tạo đơn.');
    return {
      name: input.shippingName?.trim() || buyer.displayName?.trim() || null,
      phone,
      address,
      districtId: input.shippingDistrictId ?? null,
      districtName: input.shippingDistrictName?.trim() || null,
      wardCode: input.shippingWardCode?.trim() || null,
      wardName: input.shippingWardName?.trim() || null,
    };
  }

  private async resolveShippingMethod(providerCode: string | null | undefined) {
    const carriers = await this.ordersRepository.findActiveShippingCarriers();
    if (!carriers.length) throw new BadRequestException('No active shipping provider is available');
    const requested = providerCode?.trim().toUpperCase() || null;
    const selected = (requested ? carriers.find((carrier) => carrier.code === requested) : null) ?? carriers.find((carrier) => carrier.code === 'GHN') ?? carriers[0];
    if (requested && selected.code !== requested) {
      throw new BadRequestException('Đơn vị vận chuyển đã chọn hiện không khả dụng.');
    }
    return {
      providerCode: selected.code,
      providerName: selected.name,
      shippingFee: 0,
    };
  }

  private resolveShippingParcel(offer: OfferForOrdering, providerCode: string) {
    const parcel = {
      parcelWeightGrams: offer.parcelWeightGrams ?? null,
      parcelLengthCm: offer.parcelLengthCm ?? null,
      parcelWidthCm: offer.parcelWidthCm ?? null,
      parcelHeightCm: offer.parcelHeightCm ?? null,
    };
    if (providerCode !== 'SELF_DELIVERY' && Object.values(parcel).some((value) => !value || value < 1)) {
      throw new BadRequestException('Offer parcel weight and dimensions are required for integrated shipping');
    }
    return parcel;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
