import { Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

const MAX_LINEAGE_DEPTH = 8;

type LineageOrderItem = NonNullable<Awaited<ReturnType<DistributionPricingRepository['findLineageOrderItem']>>>;
type LineageAllocation = LineageOrderItem['batchAllocations'][number];

@Injectable()
export class GetOrderItemLineageUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; orderItemId: string }) {
    const root = await this.repository.findLineageOrderItem(input.orderItemId);

    if (!root || !this.canAccessRoot(root, input.requesterUserId)) {
      throw new NotFoundException('Order item lineage not found');
    }

    const visited = new Set<string>();
    const terminalBatches: ReturnType<typeof toLineageBatch>[] = [];
    const hops = await this.resolveHops(root, visited, terminalBatches, 0);

    return {
      orderItemId: root.id,
      orderId: root.order.id,
      terminalBatches,
      hops,
    };
  }

  private canAccessRoot(item: LineageOrderItem, requesterUserId: string) {
    return (
      item.order.buyerUserId === requesterUserId ||
      item.order.shop.ownerUserId === requesterUserId ||
      item.order.buyerShop?.ownerUserId === requesterUserId
    );
  }

  private async resolveHops(
    item: LineageOrderItem,
    visited: Set<string>,
    terminalBatches: ReturnType<typeof toLineageBatch>[],
    depth: number,
  ): Promise<ReturnType<typeof toLineageHop>[]> {
    if (visited.has(item.id) || depth > MAX_LINEAGE_DEPTH) {
      return [];
    }

    visited.add(item.id);

    const upstreamHops: ReturnType<typeof toLineageHop>[] = [];

    for (const allocation of item.batchAllocations) {
      const sourceOrderItemId = allocation.batch.sourceOrderItemId;

      if (!sourceOrderItemId) {
        terminalBatches.push(toLineageBatch(allocation));
        continue;
      }

      const upstreamItem = await this.repository.findLineageOrderItem(sourceOrderItemId);

      if (!upstreamItem) {
        terminalBatches.push(toLineageBatch(allocation));
        continue;
      }

      upstreamHops.push(...(await this.resolveHops(upstreamItem, visited, terminalBatches, depth + 1)));
    }

    return [...upstreamHops, toLineageHop(item)];
  }
}

function toLineageHop(item: LineageOrderItem) {
  return {
    orderId: item.order.id,
    orderItemId: item.id,
    offerId: item.offerId,
    offerTitle: item.offerTitleSnapshot,
    quantity: item.quantity,
    sellerShopId: item.order.shop.id,
    sellerShopName: item.order.shop.shopName,
    sellerRegistrationType: item.order.shop.registrationType,
    buyerUserId: item.order.buyerUserId,
    buyerShopId: item.order.buyerShop?.id ?? null,
    buyerShopName: item.order.buyerShop?.shopName ?? null,
    batchAllocations: item.batchAllocations.map(toLineageBatch),
  };
}

function toLineageBatch(allocation: LineageAllocation) {
  const batch = allocation.batch;

  return {
    allocationId: allocation.id,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    allocatedQuantity: allocation.quantity,
    batchQuantity: batch.quantity,
    sourceName: batch.sourceName,
    countryOfOrigin: batch.countryOfOrigin,
    sourceType: batch.sourceType,
    sourceOrderId: batch.sourceOrderId,
    sourceOrderItemId: batch.sourceOrderItemId,
    sourceShopId: batch.shopId,
    sourceShopName: batch.shop.shopName,
    distributionNodeId: batch.distributionNodeId,
    distributionLevel: batch.distributionNode?.level ?? null,
    distributionNodeType: batch.distributionNode?.nodeType ?? null,
    receivedAt: batch.receivedAt,
    allocatedAt: allocation.createdAt,
  };
}
