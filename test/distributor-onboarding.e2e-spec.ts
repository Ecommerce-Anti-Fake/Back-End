import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { OfferSalesMode, ShopRegistrationType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { DistributionPricingRepository } from '@distribution/infrastructure/persistence/distribution-pricing.repository';
import {
  AcceptDistributionNodeInvitationUseCase,
  InviteDistributionNodeUseCase,
} from '@distribution/application/use-cases';
import { CreateWholesaleOrderUseCase } from '@orders/application/use-cases';
import { OrderInventoryService, OrderPlacementService } from '@orders/application/services';
import { LocalOrderInventoryAdapter, LocalWholesalePricingAdapter } from '@orders/infrastructure/adapters';
import { OrdersRepository } from '@orders/infrastructure/persistence/orders.repository';

describe('Distributor onboarding (e2e)', () => {
  let prisma: PrismaService;
  let inviteNode: InviteDistributionNodeUseCase;
  let acceptInvitation: AcceptDistributionNodeInvitationUseCase;
  let createWholesaleOrder: CreateWholesaleOrderUseCase;
  const createdInviteeUserIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService());
    await prisma.$connect();

    const distributionRepository = new DistributionPricingRepository(prisma);
    const ordersRepository = new OrdersRepository(prisma);
    const wholesalePricing = new LocalWholesalePricingAdapter(ordersRepository);
    const orderInventory = new LocalOrderInventoryAdapter(ordersRepository);
    const orderInventoryService = new OrderInventoryService(orderInventory);
    const orderPlacementService = new OrderPlacementService(ordersRepository, orderInventoryService);

    inviteNode = new InviteDistributionNodeUseCase(distributionRepository);
    acceptInvitation = new AcceptDistributionNodeInvitationUseCase(distributionRepository);
    createWholesaleOrder = new CreateWholesaleOrderUseCase(
      ordersRepository,
      orderPlacementService,
      wholesalePricing,
    );

    await upsertBaseFixtures();
  });

  afterAll(async () => {
    await cleanupCreatedInvitees();
    await prisma.$disconnect();
  });

  it('invites a distributor, accepts the invitation, and applies L1 wholesale pricing', async () => {
    const suffix = randomUUID();
    const inviteeUserId = `user-e2e-invitee-${suffix}`;
    const inviteeShopId = `shop-e2e-invitee-${suffix}`;
    const inviteePhone = `09${suffix.replaceAll('-', '').slice(0, 8)}`;
    createdInviteeUserIds.push(inviteeUserId);

    await prisma.user.create({
      data: {
        id: inviteeUserId,
        email: `${inviteeUserId}@example.com`,
        phone: inviteePhone,
        displayName: 'E2E Invited Distributor',
        role: 'user',
        accountStatus: 'active',
      },
    });

    await prisma.shop.create({
      data: {
        id: inviteeShopId,
        ownerUserId: inviteeUserId,
        shopName: 'E2E Invited Distributor Shop',
        registrationType: ShopRegistrationType.DISTRIBUTOR,
        businessType: 'COMPANY',
        taxCode: `E2E-${suffix.slice(0, 8)}`,
        shopStatus: 'active',
      },
    });

    const invitation = await inviteNode.execute({
      requesterUserId: 'user-e2e-manufacturer',
      networkId: 'network-e2e-onboarding',
      shopId: inviteeShopId,
      parentNodeId: 'node-e2e-manufacturer',
    });

    expect(invitation.level).toBe(1);
    expect(invitation.relationshipStatus).toBe('INVITED');

    const acceptedNode = await acceptInvitation.execute({
      requesterUserId: inviteeUserId,
      nodeId: invitation.id,
    });

    expect(acceptedNode.relationshipStatus).toBe('ACTIVE');

    const order = await createWholesaleOrder.execute({
      buyerUserId: inviteeUserId,
      buyerShopId: inviteeShopId,
      buyerDistributionNodeId: acceptedNode.id,
      offerId: 'offer-e2e-manufacturer-wholesale',
      quantity: 2,
      shippingPhone: inviteePhone,
      shippingAddress: '123 E2E Street',
    });

    expect(order.buyerDistributionNodeId).toBe(acceptedNode.id);
    expect(order.baseAmount).toBe(2_000_000);
    expect(order.discountAmount).toBe(300_000);
    expect(order.platformFeeAmount).toBe(100_000);
    expect(order.buyerPayableAmount).toBe(1_700_000);
    expect(order.sellerReceivableAmount).toBe(1_600_000);
    expect(order.totalAmount).toBe(1_700_000);
    expect(order.items[0].unitPrice).toBe(850_000);
  });

  async function upsertBaseFixtures() {
    await prisma.brand.upsert({
      where: { id: 'brand-e2e-food' },
      update: {
        name: 'E2E Food Brand',
        registryStatus: 'approved',
      },
      create: {
        id: 'brand-e2e-food',
        name: 'E2E Food Brand',
        registryStatus: 'approved',
      },
    });

    await prisma.category.upsert({
      where: { id: 'cat-e2e-food' },
      update: {
        name: 'E2E Food',
        riskTier: 'LOW',
      },
      create: {
        id: 'cat-e2e-food',
        name: 'E2E Food',
        riskTier: 'LOW',
      },
    });

    await prisma.user.upsert({
      where: { id: 'user-e2e-manufacturer' },
      update: {
        email: 'e2e-manufacturer@example.com',
        phone: '0922000001',
        displayName: 'E2E Manufacturer',
        accountStatus: 'active',
      },
      create: {
        id: 'user-e2e-manufacturer',
        email: 'e2e-manufacturer@example.com',
        phone: '0922000001',
        displayName: 'E2E Manufacturer',
        role: 'user',
        accountStatus: 'active',
      },
    });

    await prisma.shop.upsert({
      where: { id: 'shop-e2e-manufacturer' },
      update: {
        ownerUserId: 'user-e2e-manufacturer',
        shopName: 'E2E Manufacturer Shop',
        registrationType: ShopRegistrationType.MANUFACTURER,
        businessType: 'COMPANY',
        taxCode: 'E2E-MNF',
        shopStatus: 'active',
      },
      create: {
        id: 'shop-e2e-manufacturer',
        ownerUserId: 'user-e2e-manufacturer',
        shopName: 'E2E Manufacturer Shop',
        registrationType: ShopRegistrationType.MANUFACTURER,
        businessType: 'COMPANY',
        taxCode: 'E2E-MNF',
        shopStatus: 'active',
      },
    });

    await prisma.distributionNetwork.upsert({
      where: {
        brandId_manufacturerShopId: {
          brandId: 'brand-e2e-food',
          manufacturerShopId: 'shop-e2e-manufacturer',
        },
      },
      update: {
        id: 'network-e2e-onboarding',
        networkName: 'E2E Onboarding Network',
        networkStatus: 'active',
        maxAgentDepth: 3,
      },
      create: {
        id: 'network-e2e-onboarding',
        brandId: 'brand-e2e-food',
        manufacturerShopId: 'shop-e2e-manufacturer',
        networkName: 'E2E Onboarding Network',
        networkStatus: 'active',
        maxAgentDepth: 3,
      },
    });

    await prisma.distributionNode.upsert({
      where: {
        networkId_shopId: {
          networkId: 'network-e2e-onboarding',
          shopId: 'shop-e2e-manufacturer',
        },
      },
      update: {
        id: 'node-e2e-manufacturer',
        parentNodeId: null,
        level: 0,
        nodeType: 'MANUFACTURER',
        relationshipStatus: 'ACTIVE',
        activatedAt: new Date(),
      },
      create: {
        id: 'node-e2e-manufacturer',
        networkId: 'network-e2e-onboarding',
        shopId: 'shop-e2e-manufacturer',
        parentNodeId: null,
        level: 0,
        nodeType: 'MANUFACTURER',
        relationshipStatus: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    await prisma.productModel.upsert({
      where: { id: 'model-e2e-wholesale' },
      update: {
        brandId: 'brand-e2e-food',
        categoryId: 'cat-e2e-food',
        modelName: 'E2E Wholesale Carton',
        verificationPolicy: 'STANDARD',
        approvalStatus: 'approved',
      },
      create: {
        id: 'model-e2e-wholesale',
        brandId: 'brand-e2e-food',
        categoryId: 'cat-e2e-food',
        modelName: 'E2E Wholesale Carton',
        gtin: '8930000888001',
        verificationPolicy: 'STANDARD',
        approvalStatus: 'approved',
      },
    });

    await prisma.offer.upsert({
      where: { id: 'offer-e2e-manufacturer-wholesale' },
      update: {
        distributionNodeId: 'node-e2e-manufacturer',
        price: '1000000',
        salesMode: OfferSalesMode.WHOLESALE,
        minWholesaleQty: 2,
        availableQuantity: 500,
        offerStatus: 'active',
      },
      create: {
        id: 'offer-e2e-manufacturer-wholesale',
        sellerUserId: 'user-e2e-manufacturer',
        shopId: 'shop-e2e-manufacturer',
        categoryId: 'cat-e2e-food',
        productModelId: 'model-e2e-wholesale',
        distributionNodeId: 'node-e2e-manufacturer',
        title: 'E2E Manufacturer Wholesale Carton',
        description: 'E2E wholesale offer attached to the manufacturer root node.',
        price: '1000000',
        currency: 'VND',
        salesMode: OfferSalesMode.WHOLESALE,
        minWholesaleQty: 2,
        itemCondition: 'new',
        availableQuantity: 500,
        verificationLevel: 'verified',
        offerStatus: 'active',
      },
    });
  }

  async function cleanupCreatedInvitees() {
    for (const userId of createdInviteeUserIds) {
      const orders = await prisma.order.findMany({
        where: { buyerUserId: userId },
        select: {
          id: true,
          items: {
            select: {
              id: true,
            },
          },
        },
      });
      const orderIds = orders.map((order) => order.id);
      const orderItemIds = orders.flatMap((order) => order.items.map((item) => item.id));
      const shops = await prisma.shop.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      const shopIds = shops.map((shop) => shop.id);

      await prisma.orderItemBatchAllocation.deleteMany({
        where: {
          orderItemId: {
            in: orderItemIds,
          },
        },
      });
      await prisma.paymentIntent.deleteMany({
        where: {
          orderId: {
            in: orderIds,
          },
        },
      });
      await prisma.escrow.deleteMany({
        where: {
          orderId: {
            in: orderIds,
          },
        },
      });
      await prisma.orderItem.deleteMany({
        where: {
          orderId: {
            in: orderIds,
          },
        },
      });
      await prisma.order.deleteMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      });
      await prisma.distributionNode.deleteMany({
        where: {
          shopId: {
            in: shopIds,
          },
        },
      });
      await prisma.shop.deleteMany({
        where: {
          id: {
            in: shopIds,
          },
        },
      });
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
  }
});
