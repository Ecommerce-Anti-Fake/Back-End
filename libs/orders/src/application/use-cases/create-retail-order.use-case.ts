import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderPlacementService, PayOSPaymentService, ShippingCarrierAdapterService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class CreateRetailOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderPlacementService: OrderPlacementService,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService,
  ) {}

  async execute(input: {
    buyerUserId: string;
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
    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    const shipping = this.resolveShippingSnapshot(input, buyer);

    const offer: OfferForOrdering | null = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.salesMode === 'WHOLESALE') {
      throw new BadRequestException('This offer only supports wholesale orders');
    }

    if (input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (input.quantity > offer.availableQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    const shippingMethod = this.resolveShippingMethod(input.shippingProviderCode, offer);
    const shippingParcel = this.resolveShippingParcel(offer, shippingMethod.providerCode);
    const baseAmount = Number(offer.price.toString()) * input.quantity;
    const discountAmount = 0;
    const platformFeeAmount = this.roundMoney(baseAmount * 0.2);
    const shippingQuote = await this.shippingCarrierAdapterService.quoteShipment({
      providerCode: shippingMethod.providerCode,
      shippingName: shipping.name,
      shippingPhone: shipping.phone,
      shippingAddress: shipping.address,
      shippingDistrictId: shipping.districtId,
      shippingWardCode: shipping.wardCode,
      shippingServiceId: input.shippingServiceId ?? null,
      shippingServiceTypeId: input.shippingServiceTypeId ?? null,
      ...shippingParcel,
      itemName: offer.title,
      declaredValue: baseAmount,
      fallbackFee: Number(shippingMethod.shippingFee.toString()),
    });
    const shippingFeeAmount = this.roundMoney(shippingQuote.shippingFeeAmount);
    const buyerPayableAmount = this.roundMoney(baseAmount + shippingFeeAmount);
    const sellerReceivableAmount = this.roundMoney(baseAmount - platformFeeAmount);

    const paymentMethod = input.paymentMethod ?? 'COD';
    const order = await this.orderPlacementService.createOrder({
      order: {
        buyerUserId: input.buyerUserId,
        buyerShopId: null,
        buyerDistributionNodeId: null,
        shopId: offer.shopId,
        orderMode: 'RETAIL',
        orderType: 'retail_purchase',
        orderStatus: 'pending',
        baseAmount,
        discountAmount,
        platformFeeAmount,
        buyerPayableAmount,
        sellerReceivableAmount,
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
        shippingServiceId: shippingQuote.serviceId,
        shippingServiceTypeId: shippingQuote.serviceTypeId,
        shippingFeeAmount,
        ...shippingParcel,
        paymentMethod,
        item: {
          offerId: offer.id,
          offerTitleSnapshot: offer.title,
          unitPrice: Number(offer.price.toString()),
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
            brandId: offer.productModel.brandId,
            productModelId: offer.productModelId,
            orderAmount: buyerPayableAmount,
            commissionBase: platformFeeAmount,
          }
        : undefined,
    });

    const response = toOrderResponse(order);
    if (paymentMethod !== 'PAYOS') {
      return response;
    }

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

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private resolveShippingSnapshot(
    input: {
      shippingName?: string | null;
      shippingPhone?: string | null;
      shippingAddress?: string | null;
      shippingDistrictId?: number | null;
      shippingDistrictName?: string | null;
      shippingWardCode?: string | null;
      shippingWardName?: string | null;
    },
    buyer: {
      displayName: string | null;
      phone: string | null;
    },
  ) {
    const name = input.shippingName?.trim() || buyer.displayName?.trim() || null;
    const phone = input.shippingPhone?.trim() || buyer.phone?.trim() || null;
    const address = input.shippingAddress?.trim() || null;
    const districtId = input.shippingDistrictId ?? null;
    const districtName = input.shippingDistrictName?.trim() || null;
    const wardCode = input.shippingWardCode?.trim() || null;
    const wardName = input.shippingWardName?.trim() || null;

    if (!phone) {
      throw new BadRequestException('Shipping contact phone is required before creating an order');
    }

    if (!address) {
      throw new BadRequestException('Shipping address is required before creating an order');
    }

    return {
      name,
      phone,
      address,
      districtId,
      districtName,
      wardCode,
      wardName,
    };
  }

  private resolveShippingMethod(providerCode: string | null | undefined, offer: OfferForOrdering) {
    const methods = offer.shippingMethods ?? [];
    if (!methods.length) {
      throw new BadRequestException('Offer does not have any enabled shipping method');
    }

    const requestedCode = providerCode?.trim() || null;
    const selected =
      (requestedCode ? methods.find((method) => method.providerCode === requestedCode) : null) ??
      methods.find((method) => method.providerCode === 'SELF_DELIVERY') ??
      methods[0];

    if (requestedCode && selected.providerCode !== requestedCode) {
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
}
