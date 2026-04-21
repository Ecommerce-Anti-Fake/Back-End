import { Prisma } from '@prisma/client';
import { OrderBatchAllocation } from '../../infrastructure/persistence/orders.repository';

export abstract class OrderInventoryPort {
  abstract lockOfferInventoryRows(tx: Prisma.TransactionClient, offerId: string): Promise<unknown>;

  abstract decrementOfferAvailableQuantity(
    tx: Prisma.TransactionClient,
    offerId: string,
    quantity: number,
  ): Promise<boolean>;

  abstract consumeOfferBatchAllocations(
    tx: Prisma.TransactionClient,
    offerId: string,
    quantity: number,
  ): Promise<OrderBatchAllocation[]>;

  abstract incrementOfferAvailableQuantity(
    tx: Prisma.TransactionClient,
    offerId: string,
    quantity: number,
  ): Promise<unknown>;

  abstract restoreOrderItemBatchAllocations(
    tx: Prisma.TransactionClient,
    offerId: string,
    allocations: OrderBatchAllocation[],
  ): Promise<unknown>;
}
