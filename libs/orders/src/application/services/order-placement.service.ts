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
import { CodShopSettlementService } from '@wallet';

@Injectable()
export class OrderPlacementService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderInventoryService: OrderInventoryService,
    private readonly codShopSettlementService: CodShopSettlementService,
  ) {}

  createOrder(input: { order: CreateOrderRecordInput; affiliateAttribution?: AffiliateAttributionInput }): Promise<OrderWithRelations> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      await this.codShopSettlementService.assertShopsCanReceiveOrdersInTransaction(
        tx,
        [input.order.shopId],
      );
      const batchAllocations = await this.orderInventoryService.reserveForOrder(tx, {
        offerId: input.order.item.offerId,
        variantId: input.order.item.variantId!,
        quantity: input.order.item.quantity,
      });

      const order = await this.ordersRepository.createOrderRecord(tx, input.order, batchAllocations);

      if (input.order.voucherRedemptions?.length) {
        await this.ordersRepository.reserveVoucherRedemptionsInTransaction(tx, input.order.voucherRedemptions, order.id);
      }
      if (input.order.voucherAllocations?.length) {
        await tx.orderVoucherAllocation.createMany({
          data: input.order.voucherAllocations.map((allocation) => ({
            orderId: order.id,
            orderShopGroupId: order.shopGroups[0].id,
            ...allocation,
          })),
        });
      }

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
    return this.ordersRepository.withSerializableTransaction((tx) =>
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
      await this.codShopSettlementService.assertShopsCanReceiveOrdersInTransaction(
        tx,
        input.groups.map((group) => group.shopId),
      );
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
      if (input.voucherRedemptions?.length) {
        await this.ordersRepository.reserveVoucherRedemptionsInTransaction(tx, input.voucherRedemptions, order.id);
      }
      const voucherAllocations = input.groups.flatMap((group) => {
        const orderShopGroup = order.shopGroups.find((candidate) => candidate.shopId === group.shopId);
        return (group.voucherAllocations ?? []).map((allocation) => ({
          orderId: order.id,
          orderShopGroupId: orderShopGroup!.id,
          ...allocation,
        }));
      });
      if (voucherAllocations.length) {
        await tx.orderVoucherAllocation.createMany({ data: voucherAllocations });
      }
      if (input.affiliateAttribution) {
        await this.ordersRepository.createAffiliateAttribution(tx, order.id, input.affiliateAttribution);
      }
      return order;

  }
}
