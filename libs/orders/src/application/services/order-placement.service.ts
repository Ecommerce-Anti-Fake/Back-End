import { Injectable } from '@nestjs/common';
import {
  AffiliateAttributionInput,
  CreateOrderRecordInput,
  OrdersRepository,
  OrderWithRelations,
} from '../../infrastructure/persistence/orders.repository';
import { OrderInventoryService } from './order-inventory.service';

@Injectable()
export class OrderPlacementService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderInventoryService: OrderInventoryService,
  ) {}

  createOrder(input: {
    order: CreateOrderRecordInput;
    affiliateAttribution?: AffiliateAttributionInput;
  }): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const batchAllocations = await this.orderInventoryService.reserveForOrder(tx, {
        offerId: input.order.item.offerId,
        quantity: input.order.item.quantity,
      });

      const order = await this.ordersRepository.createOrderRecord(tx, input.order, batchAllocations);

      if (input.affiliateAttribution) {
        await this.ordersRepository.createAffiliateAttribution(tx, order.id, input.affiliateAttribution);
      }

      return order;
    });
  }
}
