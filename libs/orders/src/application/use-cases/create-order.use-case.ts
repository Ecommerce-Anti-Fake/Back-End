import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OfferForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { WholesalePricingPort } from '../ports';
import { OrderPlacementService, PayOSPaymentService, ShippingCarrierAdapterService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderPlacementService: OrderPlacementService,
    @Inject(WholesalePricingPort) private readonly wholesalePricingPort: WholesalePricingPort,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService,
  ) {}

  async execute(input: {
    buyerUserId: string;
    buyerShopId?: string | null;
    buyerDistributionNodeId?: string | null;
    offerId: string;
    quantity: number;
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
    const buyer = await this.ordersRepository.findUserById(input.buyerUserId);
    if (!buyer) throw new NotFoundException('Buyer not found');

    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.offerStatus !== 'active') throw new BadRequestException('Only active offers can be ordered');
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    if (input.quantity > offer.availableQuantity) {
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
    const shippingMethod = this.resolveShippingMethod(input.shippingProviderCode, offer);
    const parcel = this.resolveShippingParcel(offer, shippingMethod.providerCode);
    const pricing = await this.resolvePricing(input, offer);
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
    const buyerPayableAmount = this.roundMoney(pricing.buyerPayableAmount + shippingFeeAmount);
    const paymentMethod = input.paymentMethod ?? 'COD';

    const order = await this.orderPlacementService.createOrder({
      order: {
        buyerUserId: input.buyerUserId,
        buyerShopId: input.buyerShopId ?? null,
        buyerDistributionNodeId: pricing.buyerDistributionNodeId,
        shopId: offer.shopId,
        orderStatus: 'pending',
        baseAmount: pricing.baseAmount,
        discountAmount: pricing.discountAmount,
        platformFeeAmount: pricing.platformFeeAmount,
        buyerPayableAmount,
        sellerReceivableAmount: pricing.sellerReceivableAmount,
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
        item: {
          offerId: offer.id,
          offerTitleSnapshot: offer.title,
          unitPrice: pricing.unitPrice,
          quantity: input.quantity,
          verificationLevelSnapshot: offer.verificationLevel,
        },
      },
      affiliateAttribution: input.affiliateCode
        ? {
            affiliateCode: input.affiliateCode,
            customerUserId: input.buyerUserId,
            offerId: offer.id,
            sellerShopId: offer.shopId,
            brandId: offer.brandId,
            orderAmount: buyerPayableAmount,
            commissionBase: pricing.platformFeeAmount,
          }
        : undefined,
    });

    const response = toOrderResponse(order);
    if (paymentMethod !== 'PAYOS') return response;

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

  private async resolvePricing(input: { buyerShopId?: string | null; buyerDistributionNodeId?: string | null; quantity: number }, offer: OfferForOrdering) {
    if (input.buyerShopId && input.buyerDistributionNodeId) {
      const pricing = await this.wholesalePricingPort.resolve({
        buyerShopId: input.buyerShopId,
        buyerDistributionNodeId: input.buyerDistributionNodeId,
        offer,
        quantity: input.quantity,
      });
      if (offer.distributionNode && !pricing.isInNetworkTrade) {
        throw new BadRequestException('Distribution checkout must use in-network pricing');
      }
      return pricing;
    }
    const unitPrice = Number(offer.price.toString());
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
    if (!phone) throw new BadRequestException('Shipping contact phone is required before creating an order');
    if (!address) throw new BadRequestException('Shipping address is required before creating an order');
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

  private resolveShippingMethod(providerCode: string | null | undefined, offer: OfferForOrdering) {
    const methods = offer.shippingMethods ?? [];
    if (!methods.length) throw new BadRequestException('Offer does not have any enabled shipping method');
    const requested = providerCode?.trim() || null;
    const selected = (requested ? methods.find((method) => method.providerCode === requested) : null) ?? methods.find((method) => method.providerCode === 'SELF_DELIVERY') ?? methods[0];
    if (requested && selected.providerCode !== requested) {
      throw new BadRequestException('Shipping provider is not enabled for this offer');
    }
    return selected;
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
