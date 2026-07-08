import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ShopRegistrationType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { DistributionPricingRepository } from '@distribution/infrastructure/persistence/distribution-pricing.repository';
import {
  AcceptDistributionNodeInvitationUseCase,
  InviteDistributionNodeUseCase,
} from '@distribution/application/use-cases';
import {
  CreateOrderUseCase,
  ReceiveWholesaleOrderInventoryUseCase,
} from '@orders/application/use-cases';
import {
  OrderInventoryService,
  OrderPlacementService,
} from '@orders/application/services';
import {
  LocalOrderInventoryAdapter,
  LocalWholesalePricingAdapter,
} from '@orders/infrastructure/adapters';
import { OrdersRepository } from '@orders/infrastructure/persistence/orders.repository';

describe('Distributor onboarding (e2e)', () => {
  let prisma: PrismaService;
  let inviteNode: InviteDistributionNodeUseCase;
  let acceptInvitation: AcceptDistributionNodeInvitationUseCase;
  let createOrder: CreateOrderUseCase;
  let receiveWholesaleInventory: ReceiveWholesaleOrderInventoryUseCase;
  let ordersRepository: OrdersRepository;
  const createdInviteeUserIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService());
    await prisma.$connect();

    const distributionRepository = new DistributionPricingRepository(prisma);
    ordersRepository = new OrdersRepository(prisma);
    const wholesalePricing = new LocalWholesalePricingAdapter(ordersRepository);
    const orderInventory = new LocalOrderInventoryAdapter(ordersRepository);
    const orderInventoryService = new OrderInventoryService(orderInventory);
    const orderPlacementService = new OrderPlacementService(
      ordersRepository,
      orderInventoryService,
    );

    inviteNode = new InviteDistributionNodeUseCase(distributionRepository);
    acceptInvitation = new AcceptDistributionNodeInvitationUseCase(
      distributionRepository,
    );
    createOrder = new CreateOrderUseCase(
      ordersRepository,
      orderPlacementService,
      wholesalePricing,
      { createPaymentLink: jest.fn() } as never,
      {
        quoteShipment: jest.fn().mockResolvedValue({
          shippingFeeAmount: 0,
          serviceId: null,
          serviceTypeId: null,
        }),
      } as never,
    );
    receiveWholesaleInventory = new ReceiveWholesaleOrderInventoryUseCase(
      ordersRepository,
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

    const order = await createOrder.execute({
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

  it('continues distributor resale inventory from L1 to L2 to L3', async () => {
    const suffix = randomUUID();
    const l1 = await createDistributorFixture('l1', suffix);
    const l2 = await createDistributorFixture('l2', suffix);
    const l3 = await createDistributorFixture('l3', suffix);

    const l1Node = await inviteAndAcceptDistributor({
      requesterUserId: 'user-e2e-manufacturer',
      inviteeUserId: l1.userId,
      inviteeShopId: l1.shopId,
      parentNodeId: 'node-e2e-manufacturer',
    });
    const l2Node = await inviteAndAcceptDistributor({
      requesterUserId: 'user-e2e-manufacturer',
      inviteeUserId: l2.userId,
      inviteeShopId: l2.shopId,
      parentNodeId: l1Node.id,
    });
    const l3Node = await inviteAndAcceptDistributor({
      requesterUserId: 'user-e2e-manufacturer',
      inviteeUserId: l3.userId,
      inviteeShopId: l3.shopId,
      parentNodeId: l2Node.id,
    });

    const l1Purchase = await createOrder.execute({
      buyerUserId: l1.userId,
      buyerShopId: l1.shopId,
      buyerDistributionNodeId: l1Node.id,
      offerId: 'offer-e2e-manufacturer-wholesale',
      quantity: 2,
      shippingPhone: l1.phone,
      shippingAddress: 'L1 receiving address',
    });
    await markWholesaleOrderDelivered(l1Purchase.id);
    const l1Receipt = await receiveWholesaleInventory.execute({
      id: l1Purchase.id,
      requesterUserId: l1.userId,
    });
    expect(l1Receipt.batches[0].sourceOrderId).toBe(l1Purchase.id);
    expect(l1Receipt.batches[0].sourceOrderItemId).toBe(l1Purchase.items[0].id);

    const l1ResaleOfferId = `offer-e2e-l1-resale-${suffix}`;
    await createResaleOfferFromBatch({
      offerId: l1ResaleOfferId,
      sellerUserId: l1.userId,
      shopId: l1.shopId,
      distributionNodeId: l1Node.id,
      batchId: l1Receipt.batches[0].id,
      title: 'E2E L1 resale carton',
      price: 1_100_000,
      quantity: 2,
    });

    const l2Purchase = await createOrder.execute({
      buyerUserId: l2.userId,
      buyerShopId: l2.shopId,
      buyerDistributionNodeId: l2Node.id,
      offerId: l1ResaleOfferId,
      quantity: 1,
      shippingPhone: l2.phone,
      shippingAddress: 'L2 receiving address',
    });
    expect(l2Purchase.buyerDistributionNodeId).toBe(l2Node.id);
    expect(l2Purchase.items[0].unitPrice).toBe(990_000);

    await ordersRepository.allocateOrderBatchesAndUpdateFulfillment(
      l2Purchase.id,
      'PROCESSING',
    );
    await markWholesaleOrderDelivered(l2Purchase.id);
    const l2Receipt = await receiveWholesaleInventory.execute({
      id: l2Purchase.id,
      requesterUserId: l2.userId,
    });
    expect(l2Receipt.batches[0].sourceOrderId).toBe(l2Purchase.id);
    expect(l2Receipt.batches[0].sourceOrderItemId).toBe(l2Purchase.items[0].id);

    const l1BatchAfterFulfillment = await prisma.supplyBatch.findUnique({
      where: { id: l1Receipt.batches[0].id },
      select: { quantity: true },
    });
    expect(l1BatchAfterFulfillment?.quantity).toBe(1);

    const l2ResaleOfferId = `offer-e2e-l2-resale-${suffix}`;
    await createResaleOfferFromBatch({
      offerId: l2ResaleOfferId,
      sellerUserId: l2.userId,
      shopId: l2.shopId,
      distributionNodeId: l2Node.id,
      batchId: l2Receipt.batches[0].id,
      title: 'E2E L2 resale carton',
      price: 1_200_000,
      quantity: 1,
    });

    const l3Purchase = await createOrder.execute({
      buyerUserId: l3.userId,
      buyerShopId: l3.shopId,
      buyerDistributionNodeId: l3Node.id,
      offerId: l2ResaleOfferId,
      quantity: 1,
      shippingPhone: l3.phone,
      shippingAddress: 'L3 receiving address',
    });

    expect(l3Purchase.buyerDistributionNodeId).toBe(l3Node.id);
    expect(l3Purchase.items[0].unitPrice).toBe(1_140_000);
    expect(l3Purchase.discountAmount).toBe(60_000);
    expect(l3Purchase.platformFeeAmount).toBe(180_000);
  }, 30_000);

  async function createDistributorFixture(
    role: 'l1' | 'l2' | 'l3',
    suffix: string,
  ) {
    const compactSuffix = suffix.replaceAll('-', '');
    const userId = `user-e2e-${role}-${suffix}`;
    const shopId = `shop-e2e-${role}-${suffix}`;
    const phone = `09${role === 'l1' ? '31' : role === 'l2' ? '32' : '33'}${compactSuffix.slice(0, 6)}`;
    createdInviteeUserIds.push(userId);

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.com`,
        phone,
        displayName: `E2E ${role.toUpperCase()} Distributor`,
        role: 'user',
        accountStatus: 'active',
      },
    });

    await prisma.shop.create({
      data: {
        id: shopId,
        ownerUserId: userId,
        shopName: `E2E ${role.toUpperCase()} Distributor Shop`,
        registrationType: ShopRegistrationType.DISTRIBUTOR,
        businessType: 'COMPANY',
        taxCode: `E2E-${role}-${compactSuffix.slice(0, 8)}`,
        shopStatus: 'active',
      },
    });

    return { userId, shopId, phone };
  }

  async function inviteAndAcceptDistributor(input: {
    requesterUserId: string;
    inviteeUserId: string;
    inviteeShopId: string;
    parentNodeId: string;
  }) {
    const invitation = await inviteNode.execute({
      requesterUserId: input.requesterUserId,
      networkId: 'network-e2e-onboarding',
      shopId: input.inviteeShopId,
      parentNodeId: input.parentNodeId,
    });

    return acceptInvitation.execute({
      requesterUserId: input.inviteeUserId,
      nodeId: invitation.id,
    });
  }

  async function markWholesaleOrderDelivered(orderId: string) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: 'DELIVERED',
      },
    });
  }

  async function createResaleOfferFromBatch(input: {
    offerId: string;
    sellerUserId: string;
    shopId: string;
    distributionNodeId: string;
    batchId: string;
    title: string;
    price: number;
    quantity: number;
  }) {
    await prisma.offer.create({
      data: {
        id: input.offerId,
        sellerUserId: input.sellerUserId,
        shopId: input.shopId,
        categoryId: 'cat-e2e-food',
        productModelId: 'model-e2e-wholesale',
        distributionNodeId: input.distributionNodeId,
        title: input.title,
        description:
          'E2E resale offer created from received distributor inventory.',
        price: input.price.toString(),
        currency: 'VND',
        itemCondition: 'new',
        availableQuantity: input.quantity,
        offerStatus: 'active',
      },
    });

    await prisma.offerBatchLink.create({
      data: {
        offerId: input.offerId,
        batchId: input.batchId,
        allocatedQuantity: input.quantity,
      },
    });
  }

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
        description:
          'E2E wholesale offer attached to the manufacturer root node.',
        price: '1000000',
        currency: 'VND',
        itemCondition: 'new',
        availableQuantity: 500,
        offerStatus: 'active',
      },
    });
  }

  async function cleanupCreatedInvitees() {
    for (const userId of createdInviteeUserIds) {
      const shops = await prisma.shop.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      const shopIds = shops.map((shop) => shop.id);
      const offers = await prisma.offer.findMany({
        where: { shopId: { in: shopIds } },
        select: { id: true },
      });
      const offerIds = offers.map((offer) => offer.id);
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { buyerUserId: userId },
            { buyerShopId: { in: shopIds } },
            { shopId: { in: shopIds } },
            { items: { some: { offerId: { in: offerIds } } } },
          ],
        },
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
      const orderItemIds = orders.flatMap((order) =>
        order.items.map((item) => item.id),
      );

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
      await prisma.auditLog.deleteMany({
        where: {
          OR: [{ actorUserId: userId }, { targetId: { in: orderIds } }],
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
      await prisma.offerBatchLink.deleteMany({
        where: {
          OR: [
            {
              offer: {
                shopId: {
                  in: shopIds,
                },
              },
            },
            {
              batch: {
                shopId: {
                  in: shopIds,
                },
              },
            },
          ],
        },
      });
      await prisma.offer.deleteMany({
        where: {
          shopId: {
            in: shopIds,
          },
        },
      });
      await prisma.batchDocument.deleteMany({
        where: {
          batch: {
            shopId: {
              in: shopIds,
            },
          },
        },
      });
      await prisma.supplyBatch.deleteMany({
        where: {
          shopId: {
            in: shopIds,
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
