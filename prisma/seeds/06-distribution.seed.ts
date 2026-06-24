import {
  DistributionDiscountType,
  DistributionNodeType,
  DistributionPricingScope,
  DistributionRelationshipStatus,
  DistributionShipmentStatus,
  PrismaClient,
} from '@prisma/client';
import { COUNTS, id, money, pick, recentDate, SeedContext } from './00-utils';

function nodeTypeByLevel(level: number): DistributionNodeType {
  if (level === 0) return DistributionNodeType.MANUFACTURER;
  if (level === 1) return DistributionNodeType.AGENT_LEVEL_1;
  if (level === 2) return DistributionNodeType.AGENT_LEVEL_2;
  return DistributionNodeType.AGENT_LEVEL_3;
}

export async function seedDistribution(prisma: PrismaClient, ctx: SeedContext) {
  for (let n = 0; n < COUNTS.distributionNetworks; n += 1) {
    const rootShop = pick(ctx.manufacturerShops, n);
    const brand = pick(ctx.brands, n);
    const network = await prisma.distributionNetwork.create({
      data: {
        id: id(),
        brandId: brand.id,
        manufacturerShopId: rootShop.id,
        networkName: `${brand.name} Distribution Network ${n + 1}`,
        networkStatus: 'active',
        maxAgentDepth: 3,
        rulesJson: { territoryPolicy: 'province_exclusive', maxDepth: 3, seed: true },
        createdAt: recentDate(90 - n * 10),
      },
    });
    ctx.networks.push(network);

    const uniqueShops = new Map<string, (typeof ctx.shops)[number]>();

    [rootShop, ...ctx.distributorShops, ...ctx.shops].forEach((shop) => {
      uniqueShops.set(shop.id, shop);
    });

    const shopsForNetwork = Array.from(uniqueShops.values()).slice(0, 15);
    const createdNodes: { id: string; level: number }[] = [];

    for (let i = 0; i < shopsForNetwork.length; i += 1) {
      const level = i === 0 ? 0 : i <= 2 ? 1 : i <= 6 ? 2 : 3;
      const parent = i === 0 ? null : level === 1 ? createdNodes[0] : createdNodes[Math.max(1, Math.floor((i - 1) / 2))];
      const node = await prisma.distributionNode.create({
        data: {
          id: id(),
          networkId: network.id,
          shopId: shopsForNetwork[i].id,
          parentNodeId: parent?.id ?? null,
          level,
          nodeType: nodeTypeByLevel(level),
          relationshipStatus: DistributionRelationshipStatus.ACTIVE,
          contractCode: `DIST-${n + 1}-${String(i + 1).padStart(3, '0')}`,
          lineageCode: `${n + 1}.${i + 1}`,
          territoryCode: ['HCM', 'HN', 'DN', 'CT', 'BD'][i % 5],
          activatedAt: recentDate(70 - i),
        },
      });
      createdNodes.push({ id: node.id, level });
      ctx.nodes.push(node);
    }
  }

  for (let i = 0; i < COUNTS.distributionPricingPolicies; i += 1) {
    const network = pick(ctx.networks, i);
    const node = i % 3 === 0 ? pick(ctx.nodes.filter((item) => item.networkId === network.id), i) : null;
    await prisma.distributionPricingPolicy.create({
      data: {
        id: id(),
        networkId: network.id,
        nodeId: node?.id ?? null,
        appliesToLevel: node ? null : i % 4,
        categoryId: i % 2 === 0 ? pick(ctx.categories, i).id : null,
        scope: node ? DistributionPricingScope.NODE_SPECIFIC : i % 2 === 0 ? DistributionPricingScope.NODE_LEVEL : DistributionPricingScope.NETWORK_DEFAULT,
        discountType: i % 3 === 0 ? DistributionDiscountType.FIXED_AMOUNT : DistributionDiscountType.PERCENT,
        discountValue: money(i % 3 === 0 ? 20000 + i * 1000 : 5 + (i % 10)),
        minQuantity: i % 2 === 0 ? 5 + (i % 10) : null,
        priority: 10 + i,
        isActive: i % 9 !== 0,
        startsAt: recentDate(30),
        endsAt: recentDate(-90),
      },
    });
  }

  for (let i = 0; i < COUNTS.distributionShipments; i += 1) {
    const network = pick(ctx.networks, i);
    const networkNodes = ctx.nodes.filter((node) => node.networkId === network.id);
    const fromNode = pick(networkNodes.filter((node) => node.level < 3), i);
    const toNode = pick(networkNodes.filter((node) => node.id !== fromNode.id && node.level >= fromNode.level), i + 1);
    const status = [DistributionShipmentStatus.DRAFT, DistributionShipmentStatus.IN_TRANSIT, DistributionShipmentStatus.DELIVERED, DistributionShipmentStatus.RETURNED][i % 4];
    const shipment = await prisma.distributionShipment.create({
      data: {
        id: id(),
        networkId: network.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        shipmentCode: `SHIP-${String(i + 1).padStart(5, '0')}`,
        shipmentStatus: status,
        note: status === DistributionShipmentStatus.RETURNED ? 'Hàng bị trả về do sai địa chỉ kho.' : null,
        shippedAt: status === DistributionShipmentStatus.DRAFT ? null : recentDate(12 - (i % 8)),
        receivedAt: status === DistributionShipmentStatus.DELIVERED ? recentDate(5 - (i % 3)) : null,
      },
    });

    for (let j = 0; j < 2; j += 1) {
      const batch = pick(ctx.batches, i + j);
      await prisma.distributionShipmentItem.create({
        data: {
          id: id(),
          shipmentId: shipment.id,
          batchId: batch.id,
          brandId: batch.brandId,
          categoryId: batch.categoryId,
          modelName: batch.modelName,
          gtin: batch.gtin,
          verificationPolicy: batch.verificationPolicy,
          quantity: 10 + ((i + j) % 8) * 5,
          unitCost: money(35000 + (i + j) * 2000),
        },
      });
    }
  }
}
