import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository, SupplyBatchReceipt } from '../../infrastructure/persistence/orders.repository';

export type WholesaleInventoryReceiptResponse = {
  orderId: string;
  received: boolean;
  batches: SupplyBatchReceipt[];
};

@Injectable()
export class ReceiveWholesaleOrderInventoryUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { id: string; requesterUserId: string }): Promise<WholesaleInventoryReceiptResponse> {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerShop?.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the wholesale buyer shop owner can receive this order into inventory');
    }

    if (order.orderMode !== 'WHOLESALE' || !order.buyerShopId || !order.buyerDistributionNodeId) {
      throw new BadRequestException('Only distributor wholesale orders can be received into inventory');
    }

    if (order.fulfillmentStatus !== 'DELIVERED') {
      throw new BadRequestException('Only delivered wholesale orders can be received into inventory');
    }

    const batches = await this.ordersRepository.receiveWholesaleOrderIntoInventory(order);

    await this.ordersRepository.createAuditLog({
      targetType: 'ORDER',
      targetId: order.id,
      actorUserId: input.requesterUserId,
      action: 'WHOLESALE_INVENTORY_RECEIVED',
      fromStatus: order.fulfillmentStatus,
      toStatus: order.fulfillmentStatus,
      note: 'Wholesale buyer received delivered order into distributor inventory',
      metadata: {
        event: 'WHOLESALE_INVENTORY_RECEIVED',
        batchIds: batches.map((batch) => batch.id),
        batchLineage: batches.map((batch) => ({
          batchId: batch.id,
          sourceOrderId: batch.sourceOrderId,
          sourceOrderItemId: batch.sourceOrderItemId,
        })),
        buyerShopId: order.buyerShopId,
        buyerDistributionNodeId: order.buyerDistributionNodeId,
      },
    });

    return {
      orderId: order.id,
      received: true,
      batches,
    };
  }
}
