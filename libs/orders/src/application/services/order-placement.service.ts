import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AffiliateAttributionInput,
  CreateAggregateOrderRecordInput,
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

  createOrder(input: { order: CreateOrderRecordInput; affiliateAttribution?: AffiliateAttributionInput }): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const batchAllocations = await this.orderInventoryService.reserveForOrder(tx, {
        offerId: input.order.item.offerId,
        variantId: input.order.item.variantId!,
        quantity: input.order.item.quantity,
      });

      const order = await this.ordersRepository.createOrderRecord(tx, input.order, batchAllocations);

      if (input.affiliateAttribution) {
        await this.ordersRepository.createAffiliateAttribution(tx, order.id, input.affiliateAttribution);
      }

      return order;
    });
  }

  createAggregateOrder(
    input: Omit<CreateAggregateOrderRecordInput, 'groups'> & {
      groups: Array<
        Omit<CreateAggregateOrderRecordInput['groups'][number], 'items'> & {
          items: Array<Omit<CreateAggregateOrderRecordInput['groups'][number]['items'][number], 'batchAllocations'>>;
        }
      >;
      affiliateAttribution?: AffiliateAttributionInput;
    },
  ): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction((tx) =>
      this.createAggregateOrderInTransaction(tx, input),
    );
  }

  async createAggregateOrderInTransaction(
    tx: Prisma.TransactionClient,
    input: Omit<CreateAggregateOrderRecordInput, 'groups'> & {
      groups: Array<
        Omit<CreateAggregateOrderRecordInput['groups'][number], 'items'> & {
          items: Array<Omit<CreateAggregateOrderRecordInput['groups'][number]['items'][number], 'batchAllocations'>>;
        }
      >;
      affiliateAttribution?: AffiliateAttributionInput;
    },
  ): Promise<OrderWithRelations> {
      const groups: CreateAggregateOrderRecordInput['groups'] = [];
      for (const group of input.groups) {
        const items: CreateAggregateOrderRecordInput['groups'][number]['items'] = [];
        for (const item of group.items) {
          const batchAllocations = await this.orderInventoryService.reserveForOrder(tx, {
            offerId: item.offerId,
            variantId: item.variantId!,
            quantity: item.quantity,
          });
          items.push({ ...item, batchAllocations });
        }
        groups.push({ ...group, items });
      }

      const order = await this.ordersRepository.createAggregateOrderRecord(tx, {
        ...input,
        groups,
      });
      if (input.affiliateAttribution) {
        await this.ordersRepository.createAffiliateAttribution(tx, order.id, input.affiliateAttribution);
      }
      return order;

  }
}
