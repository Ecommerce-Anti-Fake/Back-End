import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderInventoryPort } from '../../application/ports';
import { OrderBatchAllocation, OrdersRepository } from '../persistence/orders.repository';

@Injectable()
export class LocalOrderInventoryAdapter implements OrderInventoryPort {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  lockOfferInventoryRows(tx: Prisma.TransactionClient, offerId: string) {
    return this.ordersRepository.lockOfferInventoryRows(tx, offerId);
  }

  decrementOfferAvailableQuantity(tx: Prisma.TransactionClient, offerId: string, quantity: number) {
    return this.ordersRepository.decrementOfferAvailableQuantity(tx, offerId, quantity);
  }

  consumeOfferBatchAllocations(tx: Prisma.TransactionClient, offerId: string, quantity: number) {
    return this.ordersRepository.consumeOfferBatchAllocations(tx, offerId, quantity);
  }

  incrementOfferAvailableQuantity(tx: Prisma.TransactionClient, offerId: string, quantity: number) {
    return this.ordersRepository.incrementOfferAvailableQuantity(tx, offerId, quantity);
  }

  restoreOrderItemBatchAllocations(
    tx: Prisma.TransactionClient,
    offerId: string,
    allocations: OrderBatchAllocation[],
  ) {
    return this.ordersRepository.restoreOrderItemBatchAllocations(tx, offerId, allocations);
  }
}
