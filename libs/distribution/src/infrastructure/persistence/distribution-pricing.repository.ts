import { Injectable } from '@nestjs/common';
import { ShopRegistrationType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class DistributionPricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedManufacturerShop(shopId: string, requesterUserId: string) {
    return this.prisma.shop.findFirst({
      where: {
        id: shopId,
        ownerUserId: requesterUserId,
        registrationType: ShopRegistrationType.MANUFACTURER,
        shopStatus: 'active',
      },
      select: {
        id: true,
      },
    });
  }

  findBrandById(id: string) {
    return this.prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  findOwnedNetworkByUser(networkId: string, requesterUserId: string) {
    return this.prisma.distributionNetwork.findFirst({
      where: {
        id: networkId,
        manufacturerShop: {
          ownerUserId: requesterUserId,
        },
      },
      select: {
        id: true,
        manufacturerShopId: true,
        manufacturerShop: {
          select: {
            id: true,
            shopStatus: true,
          },
        },
      },
    });
  }

  createNetworkWithRootNode(data: {
    brandId: string;
    manufacturerShopId: string;
    networkName: string;
  }) {
    return this.prisma.distributionNetwork.create({
      data: {
        brandId: data.brandId,
        manufacturerShopId: data.manufacturerShopId,
        networkName: data.networkName,
        nodes: {
          create: {
            shopId: data.manufacturerShopId,
            level: 0,
            nodeType: 'MANUFACTURER',
            relationshipStatus: 'ACTIVE',
            activatedAt: new Date(),
          },
        },
      },
    });
  }

  findNetworksByOwnerUserId(requesterUserId: string) {
    return this.prisma.distributionNetwork.findMany({
      where: {
        manufacturerShop: {
          ownerUserId: requesterUserId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findNodeById(id: string) {
    return this.prisma.distributionNode.findUnique({
      where: { id },
      select: {
        id: true,
        networkId: true,
        level: true,
        shopId: true,
        parentNodeId: true,
        relationshipStatus: true,
        shop: {
          select: {
            id: true,
            shopStatus: true,
          },
        },
      },
    });
  }

  findAgentShopById(id: string) {
    return this.prisma.shop.findFirst({
      where: {
        id,
        registrationType: ShopRegistrationType.DISTRIBUTOR,
        shopStatus: 'active',
      },
      select: {
        id: true,
      },
    });
  }

  findNodeByNetworkAndShop(networkId: string, shopId: string) {
    return this.prisma.distributionNode.findFirst({
      where: {
        networkId,
        shopId,
      },
      select: {
        id: true,
      },
    });
  }

  createNode(data: {
    networkId: string;
    shopId: string;
    parentNodeId: string;
    level: number;
    nodeType: 'AGENT_LEVEL_1' | 'AGENT_LEVEL_2' | 'AGENT_LEVEL_3';
  }) {
    return this.prisma.distributionNode.create({
      data: {
        networkId: data.networkId,
        shopId: data.shopId,
        parentNodeId: data.parentNodeId,
        level: data.level,
        nodeType: data.nodeType,
        relationshipStatus: 'ACTIVE',
        activatedAt: new Date(),
      },
    });
  }

  findNodesByNetwork(networkId: string) {
    return this.prisma.distributionNode.findMany({
      where: { networkId },
      orderBy: [
        { level: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  findComparablePolicies(input: {
    networkId: string;
    productModelId?: string | null;
    categoryId?: string | null;
    minQuantity?: number | null;
  }) {
    return this.prisma.distributionPricingPolicy.findMany({
      where: {
        networkId: input.networkId,
        isActive: true,
        scope: {
          in: ['NODE_LEVEL', 'NODE_SPECIFIC'],
        },
        productModelId: input.productModelId ?? null,
        categoryId: input.categoryId ?? null,
        minQuantity: input.minQuantity ?? null,
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });
  }

  createPolicy(data: {
    networkId: string;
    nodeId: string | null;
    appliesToLevel: number | null;
    productModelId: string | null;
    categoryId: string | null;
    scope: 'NETWORK_DEFAULT' | 'NODE_LEVEL' | 'NODE_SPECIFIC';
    discountValue: number;
    minQuantity: number | null;
    priority: number;
    startsAt: Date | null;
    endsAt: Date | null;
  }) {
    return this.prisma.distributionPricingPolicy.create({
      data: {
        networkId: data.networkId,
        nodeId: data.nodeId,
        appliesToLevel: data.appliesToLevel,
        productModelId: data.productModelId,
        categoryId: data.categoryId,
        scope: data.scope,
        discountType: 'PERCENT',
        discountValue: data.discountValue,
        minQuantity: data.minQuantity,
        priority: data.priority,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
    });
  }

  findPoliciesByNetwork(networkId: string) {
    return this.prisma.distributionPricingPolicy.findMany({
      where: { networkId },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  findBatchesByIdsAndNode(batchIds: string[], nodeId: string) {
    return this.prisma.supplyBatch.findMany({
      where: {
        id: {
          in: batchIds,
        },
        distributionNodeId: nodeId,
      },
      select: {
        id: true,
        productModelId: true,
      },
    });
  }

  createShipment(data: {
    networkId: string;
    fromNodeId: string;
    toNodeId: string;
    shipmentCode: string;
    note: string | null;
    items: Array<{
      batchId: string;
      productModelId: string;
      quantity: number;
      unitCost: number | null;
    }>;
  }) {
    return this.prisma.distributionShipment.create({
      data: {
        networkId: data.networkId,
        fromNodeId: data.fromNodeId,
        toNodeId: data.toNodeId,
        shipmentCode: data.shipmentCode,
        shipmentStatus: 'DRAFT',
        note: data.note,
        items: {
          create: data.items.map((item) => ({
            batchId: item.batchId,
            productModelId: item.productModelId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  findShipmentsByNetwork(networkId: string) {
    return this.prisma.distributionShipment.findMany({
      where: { networkId },
      include: {
        items: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findDispatchableShipmentById(shipmentId: string, requesterUserId: string) {
    return this.prisma.distributionShipment.findFirst({
      where: {
        id: shipmentId,
        fromNode: {
          shop: {
            ownerUserId: requesterUserId,
          },
        },
      },
      include: {
        items: true,
      },
    });
  }

  findReceivableShipmentById(shipmentId: string, requesterUserId: string) {
    return this.prisma.distributionShipment.findFirst({
      where: {
        id: shipmentId,
        toNode: {
          shop: {
            ownerUserId: requesterUserId,
          },
        },
      },
      include: {
        items: true,
      },
    });
  }

  dispatchShipment(shipmentId: string) {
    return this.prisma.distributionShipment.update({
      where: { id: shipmentId },
      data: {
        shipmentStatus: 'IN_TRANSIT',
        shippedAt: new Date(),
      },
      include: {
        items: true,
      },
    });
  }

  receiveShipment(shipmentId: string, toNodeId: string) {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.distributionShipment.update({
        where: { id: shipmentId },
        data: {
          shipmentStatus: 'DELIVERED',
          receivedAt: new Date(),
        },
        include: {
          items: true,
        },
      });

      const batchIds = shipment.items.map((item) => item.batchId);
      if (batchIds.length > 0) {
        await tx.supplyBatch.updateMany({
          where: {
            id: {
              in: batchIds,
            },
          },
          data: {
            distributionNodeId: toNodeId,
          },
        });
      }

      return shipment;
    });
  }

  cancelShipment(shipmentId: string) {
    return this.prisma.distributionShipment.update({
      where: { id: shipmentId },
      data: {
        shipmentStatus: 'CANCELLED',
      },
      include: {
        items: true,
      },
    });
  }
}
