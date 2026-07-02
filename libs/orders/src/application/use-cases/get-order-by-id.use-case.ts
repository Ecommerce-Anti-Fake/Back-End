import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse, toOrderDetailResponse } from './orders.mapper';

@Injectable()
export class GetOrderByIdUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(id: string, requesterUserId: string) {
    const order = await this.ordersRepository.findOrderById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isRetailBuyer = order.buyerUserId === requesterUserId;
    const sellerGroup = order.shopGroups?.find((group) => group.shop.ownerUserId === requesterUserId);
    const isSellerOwner = Boolean(sellerGroup) || order.shop.ownerUserId === requesterUserId;
    const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === requesterUserId;

    if (!isRetailBuyer && !isSellerOwner && !isWholesaleBuyerOwner) {
      throw new ForbiddenException('You do not have access to this order');
    }

    // Fetch audit logs for order history
    const auditLogs = await this.ordersRepository.findAuditLogsByTarget('ORDER', id);

    const orderToReturn =
      !sellerGroup || isRetailBuyer || isWholesaleBuyerOwner
        ? order
        : {
            ...order,
            shopId: sellerGroup.shopId,
            shop: { shopName: sellerGroup.shop.shopName, ownerUserId: sellerGroup.shop.ownerUserId },
            fulfillmentStatus: sellerGroup.fulfillmentStatus,
            baseAmount: sellerGroup.baseAmount,
            discountAmount: sellerGroup.discountAmount,
            platformFeeAmount: sellerGroup.platformFeeAmount,
            buyerPayableAmount: sellerGroup.baseAmount.add(sellerGroup.shippingFeeAmount),
            sellerReceivableAmount: sellerGroup.sellerReceivableAmount,
            totalAmount: sellerGroup.baseAmount.add(sellerGroup.shippingFeeAmount),
            shippingName: sellerGroup.shippingName,
            shippingPhone: sellerGroup.shippingPhone,
            shippingAddress: sellerGroup.shippingAddress,
            shippingDistrictId: sellerGroup.shippingDistrictId,
            shippingDistrictName: sellerGroup.shippingDistrictName,
            shippingWardCode: sellerGroup.shippingWardCode,
            shippingWardName: sellerGroup.shippingWardName,
            shippingProviderCode: sellerGroup.shippingProviderCode,
            shippingProviderName: sellerGroup.shippingProviderName,
            shippingServiceId: sellerGroup.shippingServiceId,
            shippingServiceTypeId: sellerGroup.shippingServiceTypeId,
            shippingFeeAmount: sellerGroup.shippingFeeAmount,
            shippingTrackingCode: sellerGroup.shippingTrackingCode,
            parcelWeightGrams: sellerGroup.parcelWeightGrams,
            parcelLengthCm: sellerGroup.parcelLengthCm,
            parcelWidthCm: sellerGroup.parcelWidthCm,
            parcelHeightCm: sellerGroup.parcelHeightCm,
            shopGroups: [sellerGroup],
            items: order.items.filter((item) => item.orderShopGroupId === sellerGroup.id),
          };

    return toOrderDetailResponse(orderToReturn, auditLogs);
  }
}
