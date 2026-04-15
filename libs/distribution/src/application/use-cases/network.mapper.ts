import { DistributionNetwork, DistributionNode, DistributionShipment, DistributionShipmentItem } from '@prisma/client';

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
