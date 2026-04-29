import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderPlacementService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class CreateRetailOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderPlacementService: OrderPlacementService,
  ) {}

  async execute(input: {
    buyerUserId: string;
    offerId: string;
    quantity: number;
    paymentMethod?: 'COD' | 'BANK_TRANSFER' | null;
    affiliateCode?: string | null;
    shippingName?: string | null;
    shippingPhone?: string | null;
    shippingAddress?: string | null;
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

    const baseAmount = Number(offer.price.toString()) * input.quantity;
    const discountAmount = 0;
    const platformFeeAmount = this.roundMoney(baseAmount * 0.2);
    const buyerPayableAmount = baseAmount;
    const sellerReceivableAmount = this.roundMoney(baseAmount - platformFeeAmount);

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
        paymentMethod: input.paymentMethod ?? 'COD',
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

    return toOrderResponse(order);
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private resolveShippingSnapshot(
    input: {
      shippingName?: string | null;
      shippingPhone?: string | null;
      shippingAddress?: string | null;
    },
    buyer: {
      displayName: string | null;
      phone: string | null;
      address: string | null;
    },
  ) {
    const name = input.shippingName?.trim() || buyer.displayName?.trim() || null;
    const phone = input.shippingPhone?.trim() || buyer.phone?.trim() || null;
    const address = input.shippingAddress?.trim() || buyer.address?.trim() || null;

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
    };
  }
}
