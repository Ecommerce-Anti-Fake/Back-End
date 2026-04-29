import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { WholesalePricingPort } from '../ports';
import { OfferForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderPlacementService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class CreateWholesaleOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderPlacementService: OrderPlacementService,
    @Inject(WholesalePricingPort)
    private readonly wholesalePricingPort: WholesalePricingPort,
  ) {}

  async execute(input: {
    buyerUserId: string;
    buyerShopId: string;
    buyerDistributionNodeId?: string;
    offerId: string;
    quantity: number;
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

    if (offer.salesMode === 'RETAIL') {
      throw new BadRequestException('This offer only supports retail orders');
    }

    if (input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (input.quantity > offer.availableQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    if (offer.minWholesaleQty && input.quantity < offer.minWholesaleQty) {
      throw new BadRequestException('Quantity does not meet minimum wholesale quantity');
    }

    const buyerShop = await this.ordersRepository.findOwnedShop(input.buyerShopId, input.buyerUserId);
    if (!buyerShop) {
      throw new BadRequestException('Buyer shop does not belong to current user');
    }

    if (buyerShop.shopStatus !== 'active') {
      throw new BadRequestException('Buyer shop must be active before creating wholesale orders');
    }

    if (offer.shopId === input.buyerShopId) {
      throw new BadRequestException('Buyer shop cannot create wholesale order for its own offer');
    }

    const pricing = await this.wholesalePricingPort.resolve({
      buyerShopId: input.buyerShopId,
      buyerDistributionNodeId: input.buyerDistributionNodeId,
      offer,
      quantity: input.quantity,
    });

    const order = await this.orderPlacementService.createOrder({
      order: {
        buyerUserId: input.buyerUserId,
        buyerShopId: input.buyerShopId,
        buyerDistributionNodeId: pricing.buyerDistributionNodeId,
        shopId: offer.shopId,
        orderMode: 'WHOLESALE',
        orderType: 'wholesale_purchase',
        orderStatus: 'pending',
        baseAmount: pricing.baseAmount,
        discountAmount: pricing.discountAmount,
        platformFeeAmount: pricing.platformFeeAmount,
        buyerPayableAmount: pricing.buyerPayableAmount,
        sellerReceivableAmount: pricing.sellerReceivableAmount,
        totalAmount: pricing.totalAmount,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingAddress: shipping.address,
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
            brandId: offer.productModel.brandId,
            productModelId: offer.productModelId,
            orderAmount: pricing.buyerPayableAmount,
            commissionBase: pricing.platformFeeAmount,
          }
        : undefined,
    });

    return toOrderResponse(order);
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
