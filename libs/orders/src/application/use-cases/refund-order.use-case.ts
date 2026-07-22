import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class RefundOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderReversalService: OrderReversalService,
  ) {}

  async execute(input: {
    id: string;
    requesterUserId: string;
    items?: Array<{ orderItemId: string; quantity: number }>;
    idempotencyKey?: string | null;
  }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!['paid', 'partially_refunded'].includes(order.orderStatus)) {
      throw new BadRequestException('Only paid or partially refunded orders can be refunded');
    }

    const ownedGroupIds = new Set(
      (order.shopGroups ?? [])
        .filter((group) => group.shop.ownerUserId === input.requesterUserId)
        .map((group) => group.id),
    );
    const isLegacyOwner = order.shop.ownerUserId === input.requesterUserId;
    if (input.items?.length) {
      const canRefundAllSelectedItems = input.items.every((requested) => {
        const item = order.items.find((candidate) => candidate.id === requested.orderItemId);
        return Boolean(item && (
          (item.orderShopGroupId && ownedGroupIds.has(item.orderShopGroupId)) ||
          (!item.orderShopGroupId && isLegacyOwner)
        ));
      });
      if (!canRefundAllSelectedItems) {
        throw new ForbiddenException('Seller can only refund items from an owned shop group');
      }
      const idempotencyKey = input.idempotencyKey?.trim();
      if (!idempotencyKey) {
        throw new BadRequestException('Idempotency-Key is required for partial refunds');
      }
      if (idempotencyKey.length > 128) {
        throw new BadRequestException('Idempotency-Key cannot exceed 128 characters');
      }
      const updatedOrder = await this.orderReversalService.partialRefundPaidOrder(
        order.id,
        input.requesterUserId,
        input.items,
        idempotencyKey,
      );
      return toOrderResponse(updatedOrder);
    }

    const ownsEveryGroup = order.shopGroups?.length
      ? order.shopGroups.every((group) => group.shop.ownerUserId === input.requesterUserId)
      : isLegacyOwner;
    if (!ownsEveryGroup) {
      throw new ForbiddenException('A seller cannot fully refund an aggregate multi-shop order');
    }

    const updatedOrder = await this.orderReversalService.refundPaidOrder(order.id, input.requesterUserId);
    return toOrderResponse(updatedOrder);
  }
}
