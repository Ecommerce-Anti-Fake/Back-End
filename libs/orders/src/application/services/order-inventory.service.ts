import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderInventoryPort } from '../ports';
import { OrderBatchAllocation } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class OrderInventoryService {
  constructor(
    @Inject(OrderInventoryPort)
    private readonly orderInventoryPort: OrderInventoryPort,
  ) {}

  async reserveForOrder(
    tx: Prisma.TransactionClient,
    input: {
      offerId: string;
      quantity: number;
    },
  ): Promise<OrderBatchAllocation[]> {
    await this.orderInventoryPort.lockOfferInventoryRows(tx, input.offerId);

    const stockReserved = await this.orderInventoryPort.decrementOfferAvailableQuantity(
      tx,
      input.offerId,
      input.quantity,
    );
    if (!stockReserved) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    return this.orderInventoryPort.consumeOfferBatchAllocations(tx, input.offerId, input.quantity);
  }

  async restoreOrderInventory(
    tx: Prisma.TransactionClient,
    order: {
      items: Array<{
        offerId: string;
        quantity: number;
        batchAllocations?: OrderBatchAllocation[];
      }>;
    },
  ) {
    for (const item of order.items) {
      await this.orderInventoryPort.incrementOfferAvailableQuantity(tx, item.offerId, item.quantity);
      await this.orderInventoryPort.restoreOrderItemBatchAllocations(tx, item.offerId, item.batchAllocations ?? []);
    }
  }
}
