import { DistributionNetwork, DistributionNode, DistributionShipment, DistributionShipmentItem, SupplyBatch } from '@prisma/client';

export function toDistributionNetworkResponse(network: DistributionNetwork) {
  return {
    id: network.id,
    brandId: network.brandId,
    manufacturerShopId: network.manufacturerShopId,
    networkName: network.networkName,
    networkStatus: network.networkStatus,
    maxAgentDepth: network.maxAgentDepth,
    createdAt: network.createdAt,
  };
}

export function toDistributionNodeResponse(node: DistributionNode) {
  return {
    id: node.id,
    networkId: node.networkId,
    shopId: node.shopId,
    parentNodeId: node.parentNodeId,
    level: node.level,
    nodeType: node.nodeType,
    relationshipStatus: node.relationshipStatus,
    createdAt: node.createdAt,
  };
}

export function toDistributionMembershipResponse(
  node: DistributionNode & {
    shop: {
      shopName: string;
    };
    network: {
      id: string;
      networkName: string;
      brandId: string;
      brand: {
        name: string;
      };
      manufacturerShopId: string;
      manufacturerShop: {
        shopName: string;
      };
    };
  },
) {
  return {
    nodeId: node.id,
    networkId: node.network.id,
    networkName: node.network.networkName,
    brandId: node.network.brandId,
    brandName: node.network.brand.name,
    manufacturerShopId: node.network.manufacturerShopId,
    manufacturerShopName: node.network.manufacturerShop.shopName,
    shopId: node.shopId,
    shopName: node.shop.shopName,
    parentNodeId: node.parentNodeId,
    level: node.level,
    nodeType: node.nodeType,
    relationshipStatus: node.relationshipStatus,
    createdAt: node.createdAt,
  };
}

export function toDistributionShipmentResponse(
  shipment: DistributionShipment & { items: DistributionShipmentItem[] },
) {
  return {
    id: shipment.id,
    networkId: shipment.networkId,
    fromNodeId: shipment.fromNodeId,
    toNodeId: shipment.toNodeId,
    shipmentCode: shipment.shipmentCode,
    shipmentStatus: shipment.shipmentStatus,
    note: shipment.note,
    shippedAt: shipment.shippedAt,
    receivedAt: shipment.receivedAt,
    items: shipment.items.map((item) => ({
      id: item.id,
      batchId: item.batchId,
      productModelId: item.productModelId,
      quantity: item.quantity,
      unitCost: item.unitCost ? Number(item.unitCost.toString()) : null,
    })),
    createdAt: shipment.createdAt,
  };
}

export function toSupplyBatchResponse(batch: SupplyBatch) {
  return {
    id: batch.id,
    shopId: batch.shopId,
    productModelId: batch.productModelId,
    distributionNodeId: batch.distributionNodeId,
    batchNumber: batch.batchNumber,
    quantity: batch.quantity,
    sourceName: batch.sourceName,
    countryOfOrigin: batch.countryOfOrigin,
    sourceType: batch.sourceType,
    receivedAt: batch.receivedAt,
  };
}

export function toSupplyBatchDetailResponse(
  batch: SupplyBatch & {
    offerLinks: Array<{
      allocatedQuantity: number;
      offer: {
        id: string;
        title: string;
        availableQuantity: number;
      };
    }>;
    orderItemAllocations: Array<{
      quantity: number;
      orderItem: {
        id: string;
        orderId: string;
        offerId: string;
        order: {
          orderStatus: string;
          createdAt: Date;
        };
      };
    }>;
    shipmentItems: Array<{
      quantity: number;
      shipment: {
        id: string;
        shipmentCode: string;
        shipmentStatus: string;
        createdAt: Date;
      };
    }>;
  },
) {
  const consumedByOffer = new Map<string, number>();
  for (const allocation of batch.orderItemAllocations) {
    const offerId = allocation.orderItem.offerId;
    const current = consumedByOffer.get(offerId) ?? 0;
    consumedByOffer.set(offerId, current + allocation.quantity);
  }

  const totalAllocatedQuantity = batch.offerLinks.reduce((sum, link) => sum + link.allocatedQuantity, 0);
  const totalConsumedQuantity = batch.orderItemAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);

  return {
    ...toSupplyBatchResponse(batch),
    totalAllocatedQuantity,
    totalConsumedQuantity,
    availableForAllocation: Math.max(batch.quantity - totalAllocatedQuantity, 0),
    allocations: batch.offerLinks.map((link) => ({
      offerId: link.offer.id,
      offerTitle: link.offer.title,
      allocatedQuantity: link.allocatedQuantity,
      consumedQuantity: consumedByOffer.get(link.offer.id) ?? 0,
      remainingAllocatedQuantity: Math.max(link.allocatedQuantity, 0),
    })),
    consumptions: batch.orderItemAllocations.map((allocation) => ({
      orderId: allocation.orderItem.orderId,
      orderItemId: allocation.orderItem.id,
      quantity: allocation.quantity,
      orderStatus: allocation.orderItem.order.orderStatus,
      createdAt: allocation.orderItem.order.createdAt,
    })),
    shipments: batch.shipmentItems.map((item) => ({
      shipmentId: item.shipment.id,
      shipmentCode: item.shipment.shipmentCode,
      shipmentStatus: item.shipment.shipmentStatus,
      quantity: item.quantity,
      createdAt: item.shipment.createdAt,
    })),
  };
}

export function toInventorySummaryResponse(input: {
  shopId: string;
  batches: Array<{
    id: string;
    batchNumber: string;
    productModelId: string;
    quantity: number;
    offerLinks: Array<{
      allocatedQuantity: number;
    }>;
    orderItemAllocations: Array<{
      quantity: number;
      orderItem: {
        offerId: string;
      };
    }>;
  }>;
  offers: Array<{
    id: string;
    title: string;
    availableQuantity: number;
    batchLinks: Array<{
      allocatedQuantity: number;
    }>;
  }>;
}) {
  const offerConsumedQuantity = new Map<string, number>();
  for (const batch of input.batches) {
    for (const allocation of batch.orderItemAllocations) {
      const current = offerConsumedQuantity.get(allocation.orderItem.offerId) ?? 0;
      offerConsumedQuantity.set(allocation.orderItem.offerId, current + allocation.quantity);
    }
  }

  const batches = input.batches.map((batch) => {
    const allocatedQuantity = batch.offerLinks.reduce((sum, link) => sum + link.allocatedQuantity, 0);
    const consumedQuantity = batch.orderItemAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);

    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productModelId: batch.productModelId,
      quantityOnHand: batch.quantity,
      allocatedQuantity,
      consumedQuantity,
      unallocatedQuantity: Math.max(batch.quantity - allocatedQuantity, 0),
    };
  });

  const offers = input.offers.map((offer) => {
    const allocatedQuantity = offer.batchLinks.reduce((sum, link) => sum + link.allocatedQuantity, 0);
    return {
      offerId: offer.id,
      title: offer.title,
      availableQuantity: offer.availableQuantity,
      allocatedQuantity,
      consumedQuantity: offerConsumedQuantity.get(offer.id) ?? 0,
    };
  });

  return {
    shopId: input.shopId,
    totalQuantityOnHand: batches.reduce((sum, batch) => sum + batch.quantityOnHand, 0),
    totalAllocatedQuantity: batches.reduce((sum, batch) => sum + batch.allocatedQuantity, 0),
    totalConsumedQuantity: batches.reduce((sum, batch) => sum + batch.consumedQuantity, 0),
    totalUnallocatedQuantity: batches.reduce((sum, batch) => sum + batch.unallocatedQuantity, 0),
    offers,
    batches,
  };
}
