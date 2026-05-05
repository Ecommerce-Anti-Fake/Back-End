import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { calculateAffiliateCommissionAmounts } from './affiliate-commission.util';
import { randomUUID } from 'crypto';

const offerForOrderingArgs = Prisma.validator<Prisma.OfferDefaultArgs>()({
  include: {
    shop: {
      select: {
        id: true,
        shopName: true,
        ownerUserId: true,
      },
    },
    productModel: {
      select: {
        brandId: true,
      },
    },
    distributionNode: {
      select: {
        id: true,
        networkId: true,
      },
    },
  },
});

const orderWithRelationsArgs = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    shop: {
      select: {
        shopName: true,
        ownerUserId: true,
      },
    },
    buyerShop: {
      select: {
        ownerUserId: true,
      },
    },
    paymentIntent: true,
    escrow: true,
    items: {
      include: {
        batchAllocations: true,
      },
    },
  },
});

const disputeWithOrderArgs = Prisma.validator<Prisma.DisputeDefaultArgs>()({
  include: {
    order: {
      include: {
        shop: {
          select: {
            ownerUserId: true,
            shopName: true,
          },
        },
        buyerShop: {
          select: {
            ownerUserId: true,
          },
        },
        paymentIntent: true,
        escrow: true,
        items: {
          include: {
            batchAllocations: true,
          },
        },
      },
    },
  },
});

const openDisputesForAdminArgs = Prisma.validator<Prisma.DisputeDefaultArgs>()({
  include: {
    order: {
      include: {
        shop: {
          select: {
            shopName: true,
          },
        },
      },
    },
  },
});

const disputeEvidenceArgs = Prisma.validator<Prisma.DisputeEvidenceDefaultArgs>()({
  include: {
    mediaAsset: true,
  },
});

const cartWithItemsArgs = Prisma.validator<Prisma.CartDefaultArgs>()({
  include: {
    items: {
      orderBy: {
        createdAt: 'asc',
      },
    },
  },
});

export type OfferForOrdering = Prisma.OfferGetPayload<typeof offerForOrderingArgs>;
export type OrderWithRelations = Prisma.OrderGetPayload<typeof orderWithRelationsArgs>;
export type CartWithItems = Prisma.CartGetPayload<typeof cartWithItemsArgs>;
export type OrderBatchAllocation = {
  batchId: string;
  quantity: number;
};
export type CreateOrderRecordInput = {
  buyerUserId: string | null;
  buyerShopId: string | null;
  buyerDistributionNodeId: string | null;
  shopId: string;
  orderMode: 'RETAIL' | 'WHOLESALE';
  orderType: string;
  orderStatus: string;
  fulfillmentStatus?: string;
  baseAmount: number;
  discountAmount: number;
  platformFeeAmount: number;
  buyerPayableAmount: number;
  sellerReceivableAmount: number;
  totalAmount: number;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'manual_confirmation' | null;
  item: {
    offerId: string;
    offerTitleSnapshot: string;
    unitPrice: number;
    quantity: number;
    verificationLevelSnapshot: string;
  };
};
export type AffiliateAttributionInput = {
  affiliateCode: string;
  customerUserId: string;
  offerId: string;
  sellerShopId: string;
  brandId: string;
  productModelId: string;
  orderAmount: number;
  commissionBase: number;
};
export type DisputeWithOrder = Prisma.DisputeGetPayload<typeof disputeWithOrderArgs>;
export type DisputeEvidenceRecord = Prisma.DisputeEvidenceGetPayload<typeof disputeEvidenceArgs>;
export type AdminOpenDisputeRecord = Prisma.DisputeGetPayload<typeof openDisputesForAdminArgs>;
export type OrderAuditLogRecord = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorUserId: string;
  createdAt: Date;
  actor: {
    id: string;
    displayName: string | null;
    email: string | null;
  };
};

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction((tx) => callback(tx));
  }

  findOrderForReversal(tx: Prisma.TransactionClient, id: string) {
    return tx.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            batchAllocations: true,
          },
        },
      },
    });
  }

  findOfferForOrdering(offerId: string): Promise<OfferForOrdering | null> {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      ...offerForOrderingArgs,
    });
  }

  async getOrCreateActiveCart(buyerUserId: string): Promise<CartWithItems> {
    const existing = await this.prisma.cart.findUnique({
      where: {
        buyerUserId_cartStatus: {
          buyerUserId,
          cartStatus: 'ACTIVE',
        },
      },
      ...cartWithItemsArgs,
    });

    if (existing) {
      return existing;
    }

    return this.prisma.cart.create({
      data: {
        buyerUserId,
        cartStatus: 'ACTIVE',
      },
      ...cartWithItemsArgs,
    });
  }

  findCartItemById(cartItemId: string) {
    return this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
      },
    });
  }

  async upsertCartItem(input: {
    buyerUserId: string;
    offerId: string;
    quantity: number;
    offerTitleSnapshot: string;
    unitPriceSnapshot: number;
    currencySnapshot: string;
    shopNameSnapshot: string;
  }): Promise<CartWithItems> {
    const cart = await this.getOrCreateActiveCart(input.buyerUserId);

    await this.prisma.cartItem.upsert({
      where: {
        cartId_offerId: {
          cartId: cart.id,
          offerId: input.offerId,
        },
      },
      update: {
        quantity: {
          increment: input.quantity,
        },
        offerTitleSnapshot: input.offerTitleSnapshot,
        unitPriceSnapshot: input.unitPriceSnapshot,
        currencySnapshot: input.currencySnapshot,
        shopNameSnapshot: input.shopNameSnapshot,
      },
      create: {
        cartId: cart.id,
        offerId: input.offerId,
        quantity: input.quantity,
        offerTitleSnapshot: input.offerTitleSnapshot,
        unitPriceSnapshot: input.unitPriceSnapshot,
        currencySnapshot: input.currencySnapshot,
        shopNameSnapshot: input.shopNameSnapshot,
      },
    });

    return this.getOrCreateActiveCart(input.buyerUserId);
  }

  async updateCartItemQuantity(input: {
    buyerUserId: string;
    cartItemId: string;
    quantity: number;
  }): Promise<CartWithItems> {
    const cartItem = await this.findCartItemById(input.cartItemId);
    if (!cartItem || cartItem.cart.buyerUserId !== input.buyerUserId || cartItem.cart.cartStatus !== 'ACTIVE') {
      throw new BadRequestException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: input.cartItemId },
      data: {
        quantity: input.quantity,
      },
    });

    return this.getOrCreateActiveCart(input.buyerUserId);
  }

  async removeCartItem(input: { buyerUserId: string; cartItemId: string }): Promise<CartWithItems> {
    const cartItem = await this.findCartItemById(input.cartItemId);
    if (!cartItem || cartItem.cart.buyerUserId !== input.buyerUserId || cartItem.cart.cartStatus !== 'ACTIVE') {
      throw new BadRequestException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: input.cartItemId },
    });

    return this.getOrCreateActiveCart(input.buyerUserId);
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        displayName: true,
      },
    });
  }

  findOwnedShop(shopId: string, ownerUserId: string) {
    return this.prisma.shop.findFirst({
      where: {
        id: shopId,
        ownerUserId,
      },
      select: {
        id: true,
        shopStatus: true,
        registrationType: true,
      },
    });
  }

  findDistributionNodeById(id: string) {
    return this.prisma.distributionNode.findUnique({
      where: { id },
      select: {
        id: true,
        shopId: true,
        networkId: true,
        level: true,
        relationshipStatus: true,
        shop: {
          select: {
            shopStatus: true,
          },
        },
      },
    });
  }

  findApplicablePricingPolicies(input: {
    networkId: string;
    nodeId: string;
    appliesToLevel: number;
    productModelId: string;
    categoryId: string;
    quantity: number;
    now: Date;
  }) {
    return this.prisma.distributionPricingPolicy.findMany({
      where: {
        networkId: input.networkId,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: input.now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: input.now } }],
          },
          {
            OR: [{ minQuantity: null }, { minQuantity: { lte: input.quantity } }],
          },
          {
            OR: [{ productModelId: null }, { productModelId: input.productModelId }],
          },
          {
            OR: [{ categoryId: null }, { categoryId: input.categoryId }],
          },
          {
            OR: [
              { scope: 'NODE_SPECIFIC', nodeId: input.nodeId },
              { scope: 'NODE_LEVEL', appliesToLevel: input.appliesToLevel },
              { scope: 'NETWORK_DEFAULT' },
            ],
          },
        ],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createOrderRecord(
    tx: Prisma.TransactionClient,
    data: CreateOrderRecordInput,
    batchAllocations: OrderBatchAllocation[],
  ): Promise<OrderWithRelations> {
    return tx.order.create({
      data: {
        buyerUserId: data.buyerUserId,
        buyerShopId: data.buyerShopId,
        buyerDistributionNodeId: data.buyerDistributionNodeId,
        shopId: data.shopId,
        orderMode: data.orderMode,
        orderType: data.orderType,
        orderStatus: data.orderStatus,
        fulfillmentStatus: data.fulfillmentStatus ?? 'PENDING',
        baseAmount: data.baseAmount,
        discountAmount: data.discountAmount,
        platformFeeAmount: data.platformFeeAmount,
        buyerPayableAmount: data.buyerPayableAmount,
        sellerReceivableAmount: data.sellerReceivableAmount,
        totalAmount: data.totalAmount,
        shippingName: data.shippingName ?? null,
        shippingPhone: data.shippingPhone ?? null,
        shippingAddress: data.shippingAddress ?? null,
        items: {
          create: {
            ...data.item,
            batchAllocations: batchAllocations.length
              ? {
                  create: batchAllocations,
                }
              : undefined,
          },
        },
        paymentIntent: {
          create: {
            paymentMethod: data.paymentMethod ?? 'manual_confirmation',
            paymentStatus: 'PENDING',
            amount: data.buyerPayableAmount,
          },
        },
        escrow: {
          create: {
            escrowStatus: 'PENDING',
            heldAmount: 0,
          },
        },
      },
      ...orderWithRelationsArgs,
    });
  }

  async createAffiliateAttribution(
    tx: Prisma.TransactionClient,
    orderId: string,
    input: AffiliateAttributionInput,
  ) {
    await this.tryCreateAffiliateAttribution(tx, orderId, input);
  }

  updatePaymentStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
    paymentStatus: 'CANCELLED' | 'REFUNDED',
  ) {
    return tx.paymentIntent.update({
      where: { orderId },
      data: {
        paymentStatus,
      },
    });
  }

  updateEscrowStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
    escrowStatus: 'CANCELLED' | 'REFUNDED',
  ) {
    return tx.escrow.updateMany({
      where: { orderId },
      data: {
        escrowStatus,
        releaseAt: new Date(),
      },
    });
  }

  cancelPendingAffiliateArtifacts(tx: Prisma.TransactionClient, orderId: string) {
    return Promise.all([
      tx.affiliateCommissionLedger.updateMany({
        where: {
          conversion: {
            orderId,
          },
          commissionStatus: 'PENDING',
        },
        data: {
          commissionStatus: 'CANCELLED',
        },
      }),
      tx.affiliateConversion.updateMany({
        where: {
          orderId,
          conversionStatus: 'PENDING',
        },
        data: {
          conversionStatus: 'CANCELLED',
        },
      }),
    ]);
  }

  cancelRefundableAffiliateArtifacts(tx: Prisma.TransactionClient, orderId: string) {
    return Promise.all([
      tx.affiliateCommissionLedger.updateMany({
        where: {
          conversion: {
            orderId,
          },
          commissionStatus: {
            in: ['PENDING', 'APPROVED', 'LOCKED'],
          },
        },
        data: {
          commissionStatus: 'CANCELLED',
          payoutId: null,
          lockedAt: null,
        },
      }),
      tx.affiliateConversion.updateMany({
        where: {
          orderId,
          conversionStatus: {
            in: ['PENDING', 'APPROVED'],
          },
        },
        data: {
          conversionStatus: 'CANCELLED',
        },
      }),
    ]);
  }

  updateOrderStatus(tx: Prisma.TransactionClient, id: string, orderStatus: string): Promise<OrderWithRelations> {
    return tx.order.update({
      where: { id },
      data: {
        orderStatus,
        fulfillmentStatus: orderStatus === 'cancelled' ? 'CANCELLED' : undefined,
      },
      ...orderWithRelationsArgs,
    });
  }

  updateFulfillmentStatus(id: string, fulfillmentStatus: string): Promise<OrderWithRelations> {
    return this.prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus,
      },
      ...orderWithRelationsArgs,
    });
  }

  updateDisputeStatus(
    tx: Prisma.TransactionClient,
    disputeId: string,
    disputeStatus: 'RESOLVED' | 'REFUNDED',
  ): Promise<DisputeWithOrder> {
    return tx.dispute.update({
      where: { id: disputeId },
      data: {
        disputeStatus,
        resolvedAt: new Date(),
      },
      ...disputeWithOrderArgs,
    });
  }

  findOrderById(id: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({
      where: { id },
      ...orderWithRelationsArgs,
    });
  }

  findOrdersForUser(requesterUserId: string): Promise<OrderWithRelations[]> {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { buyerUserId: requesterUserId },
          {
            shop: {
              is: {
                ownerUserId: requesterUserId,
              },
            },
          },
          {
            buyerShop: {
              is: {
                ownerUserId: requesterUserId,
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...orderWithRelationsArgs,
    });
  }

  async findOrdersForSellerShop(input: { requesterUserId: string; shopId: string }): Promise<OrderWithRelations[]> {
    const shop = await this.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new BadRequestException('Shop does not belong to current user');
    }

    return this.prisma.order.findMany({
      where: {
        shopId: input.shopId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...orderWithRelationsArgs,
    });
  }

  countOpenDisputes() {
    return this.prisma.dispute.count({
      where: {
        disputeStatus: 'OPEN',
      },
    });
  }

  async countDisputesByStatusAndCaseStatus() {
    const [
      open,
      resolved,
      refunded,
      assigned,
      inReview,
      escalated,
      caseResolved,
      closed,
    ] = await this.prisma.$transaction([
      this.prisma.dispute.count({ where: { disputeStatus: 'OPEN' } }),
      this.prisma.dispute.count({ where: { disputeStatus: 'RESOLVED' } }),
      this.prisma.dispute.count({ where: { disputeStatus: 'REFUNDED' } }),
      this.prisma.moderationCase.count({ where: { targetType: 'DISPUTE', caseStatus: 'ASSIGNED' } }),
      this.prisma.moderationCase.count({ where: { targetType: 'DISPUTE', caseStatus: 'IN_REVIEW' } }),
      this.prisma.moderationCase.count({ where: { targetType: 'DISPUTE', caseStatus: 'ESCALATED' } }),
      this.prisma.moderationCase.count({ where: { targetType: 'DISPUTE', caseStatus: 'RESOLVED' } }),
      this.prisma.moderationCase.count({ where: { targetType: 'DISPUTE', caseStatus: 'CLOSED' } }),
    ]);

    return {
      byDisputeStatus: {
        OPEN: open,
        RESOLVED: resolved,
        REFUNDED: refunded,
      },
      byCaseStatus: {
        ASSIGNED: assigned,
        IN_REVIEW: inReview,
        ESCALATED: escalated,
        RESOLVED: caseResolved,
        CLOSED: closed,
      },
    };
  }

  async findOpenDisputesForAdmin(filters?: {
    disputeStatus?: 'OPEN' | 'RESOLVED' | 'REFUNDED';
    assignedAdminUserId?: string;
    reason?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'openedAt' | 'orderId' | 'disputeStatus';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ total: number; items: AdminOpenDisputeRecord[] }> {
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters?.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const sortBy = filters?.sortBy ?? 'openedAt';
    const sortOrder = filters?.sortOrder ?? 'desc';
    let disputeIdsByAssignee: string[] | null = null;

    if (filters?.assignedAdminUserId) {
      const moderationTargets = await this.prisma.moderationCase.findMany({
        where: {
          targetType: 'DISPUTE',
          assignedAdminUserId: filters.assignedAdminUserId,
        },
        select: {
          targetId: true,
        },
      });

      disputeIdsByAssignee = moderationTargets.map((item) => item.targetId);
      if (disputeIdsByAssignee.length === 0) {
        return { total: 0, items: [] };
      }
    }

    const where: Prisma.DisputeWhereInput = {
      disputeStatus: filters?.disputeStatus ?? 'OPEN',
      ...(disputeIdsByAssignee
        ? {
            id: {
              in: disputeIdsByAssignee,
            },
          }
        : {}),
      ...(filters?.reason
        ? {
            reason: {
              contains: filters.reason,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              {
                reason: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                orderId: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                order: {
                  is: {
                    shop: {
                      is: {
                        shopName: {
                          contains: filters.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.dispute.count({ where }),
      this.prisma.dispute.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...openDisputesForAdminArgs,
      }),
    ]);

    return { total, items };
  }

  findOpenDisputeByOrder(orderId: string) {
    return this.prisma.dispute.findFirst({
      where: {
        orderId,
        disputeStatus: 'OPEN',
      },
      select: {
        id: true,
      },
    });
  }

  findDisputeById(id: string): Promise<DisputeWithOrder | null> {
    return this.prisma.dispute.findUnique({
      where: { id },
      ...disputeWithOrderArgs,
    });
  }

  findDisputeForResolution(tx: Prisma.TransactionClient, id: string): Promise<DisputeWithOrder | null> {
    return tx.dispute.findUnique({
      where: { id },
      ...disputeWithOrderArgs,
    });
  }

  findModerationCaseByTarget(targetType: string, targetId: string) {
    return this.prisma.moderationCase.findFirst({
      where: {
        targetType,
        targetId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  createAuditLog(input: {
    targetType: string;
    targetId: string;
    actorUserId: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const metadataSql = input.metadata
      ? Prisma.sql`CAST(${JSON.stringify(input.metadata)} AS JSONB)`
      : Prisma.sql`NULL`;

    return this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "audit_log" (
        "id",
        "target_type",
        "target_id",
        "actor_user_id",
        "action",
        "from_status",
        "to_status",
        "note",
        "metadata"
      )
      VALUES (
        ${randomUUID()},
        ${input.targetType},
        ${input.targetId},
        ${input.actorUserId},
        ${input.action},
        ${input.fromStatus ?? null},
        ${input.toStatus ?? null},
        ${input.note ?? null},
        ${metadataSql}
      )
    `);
  }

  findAuditLogsByTarget(targetType: string, targetId: string): Promise<OrderAuditLogRecord[]> {
    return this.prisma
      .$queryRaw<
        Array<{
          id: string;
          action: string;
          fromStatus: string | null;
          toStatus: string | null;
          note: string | null;
          actorUserId: string;
          createdAt: Date;
          actorId: string;
          actorDisplayName: string | null;
          actorEmail: string | null;
        }>
      >(Prisma.sql`
        SELECT
          al.id,
          al.action,
          al.from_status AS "fromStatus",
          al.to_status AS "toStatus",
          al.note,
          al.actor_user_id AS "actorUserId",
          al.created_at AS "createdAt",
          u.id AS "actorId",
          u.display_name AS "actorDisplayName",
          u.email AS "actorEmail"
        FROM "audit_log" al
        INNER JOIN "user" u ON u.id = al.actor_user_id
        WHERE al.target_type = ${targetType}
          AND al.target_id = ${targetId}
        ORDER BY al.created_at DESC
      `)
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          action: row.action,
          fromStatus: row.fromStatus,
          toStatus: row.toStatus,
          note: row.note,
          actorUserId: row.actorUserId,
          createdAt: row.createdAt,
          actor: {
            id: row.actorId,
            displayName: row.actorDisplayName,
            email: row.actorEmail,
          },
        })),
      );
  }

  async upsertDisputeModerationCase(input: {
    disputeId: string;
    assignedAdminUserId?: string | null;
    caseStatus: string;
    internalNote?: string | null;
    reason: string;
    resolvedAt?: Date | null;
  }) {
    const existing = await this.findModerationCaseByTarget('DISPUTE', input.disputeId);

    if (!existing) {
      return this.prisma.moderationCase.create({
        data: {
          targetType: 'DISPUTE',
          targetId: input.disputeId,
          reason: input.reason,
          caseStatus: input.caseStatus,
          internalNote: input.internalNote ?? null,
          assignedAdminUserId: input.assignedAdminUserId ?? null,
          resolvedAt: input.resolvedAt ?? null,
        },
      });
    }

    return this.prisma.moderationCase.update({
      where: {
        id: existing.id,
      },
      data: {
        caseStatus: input.caseStatus,
        internalNote: input.internalNote ?? existing.internalNote,
        assignedAdminUserId: input.assignedAdminUserId ?? existing.assignedAdminUserId,
        resolvedAt: input.resolvedAt ?? existing.resolvedAt,
      },
    });
  }

  findEvidenceByDisputeId(disputeId: string): Promise<DisputeEvidenceRecord[]> {
    return this.prisma.disputeEvidence.findMany({
      where: { disputeId },
      orderBy: {
        uploadedAt: 'asc',
      },
      ...disputeEvidenceArgs,
    });
  }

  async markOrderPaid(input: { id: string; providerRef: string | null }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const heldAmount = await this.getOrderPayableAmount(tx, input.id);

      await tx.paymentIntent.update({
        where: { orderId: input.id },
        data: {
          paymentStatus: 'PAID',
          providerRef: input.providerRef,
        },
      });

      await tx.escrow.upsert({
        where: { orderId: input.id },
        create: {
          orderId: input.id,
          escrowStatus: 'HELD',
          heldAmount,
          holdAt: now,
        },
        update: {
          escrowStatus: 'HELD',
          heldAmount,
          holdAt: now,
          releaseAt: null,
        },
      });

      return tx.order.update({
        where: { id: input.id },
        data: {
          orderStatus: 'paid',
          fulfillmentStatus: 'PROCESSING',
        },
        ...orderWithRelationsArgs,
      });
    });
  }

  async completeOrder(id: string): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.escrow.updateMany({
        where: { orderId: id },
        data: {
          escrowStatus: 'RELEASED',
          releaseAt: new Date(),
        },
      });

      return tx.order.update({
        where: { id },
        data: {
          orderStatus: 'completed',
          fulfillmentStatus: 'DELIVERED',
        },
        ...orderWithRelationsArgs,
      });
    });
  }

  createDispute(input: {
    orderId: string;
    openedByUserId: string;
    reason: string;
  }) {
    return this.prisma.dispute.create({
      data: {
        orderId: input.orderId,
        openedByUserId: input.openedByUserId,
        reason: input.reason,
        disputeStatus: 'OPEN',
      },
    });
  }

  createDisputeEvidence(input: {
    disputeId: string;
    uploadedByUserId: string;
    mediaAssetId: string | null;
    fileType: string;
    fileUrl: string;
  }): Promise<DisputeEvidenceRecord> {
    return this.prisma.disputeEvidence.create({
      data: {
        disputeId: input.disputeId,
        uploadedByUserId: input.uploadedByUserId,
        mediaAssetId: input.mediaAssetId,
        fileType: input.fileType,
        fileUrl: input.fileUrl,
      },
      ...disputeEvidenceArgs,
    });
  }

  private async tryCreateAffiliateAttribution(
    tx: Prisma.TransactionClient,
    orderId: string,
    input: {
      affiliateCode: string;
      customerUserId: string;
      offerId: string;
      sellerShopId: string;
      brandId: string;
      productModelId: string;
      orderAmount: number;
      commissionBase: number;
    },
  ) {
    const normalizedCode = input.affiliateCode.trim().toLowerCase();
    if (!normalizedCode) {
      return;
    }

    const referral = await tx.affiliateCode.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        programId: true,
        expiresAt: true,
        program: {
          select: {
            scopeType: true,
            ownerShopId: true,
            brandId: true,
            productModelId: true,
            offerId: true,
            programStatus: true,
            tier1Rate: true,
            tier2Rate: true,
            startedAt: true,
            endedAt: true,
          },
        },
        account: {
          select: {
            id: true,
            userId: true,
            accountStatus: true,
            parentAccount: {
              select: {
                id: true,
                accountStatus: true,
              },
            },
          },
        },
      },
    });

    if (!referral || !this.isReferralEligible(referral, input)) {
      return;
    }

    const tier2Eligible =
      referral.account.parentAccount && referral.account.parentAccount.accountStatus === 'ACTIVE';
    const commissionBase = this.roundMoney(input.commissionBase);
    const { tier1Amount, tier2Amount } = calculateAffiliateCommissionAmounts({
      commissionBase,
      tier1Rate: Number(referral.program.tier1Rate.toString()),
      tier2Rate: Number(referral.program.tier2Rate.toString()),
      tier2Eligible: !!tier2Eligible,
    });

    await tx.affiliateConversion.create({
      data: {
        programId: referral.programId,
        orderId,
        offerId: input.offerId,
        affiliateCodeId: referral.id,
        tier1AccountId: referral.account.id,
        tier2AccountId: tier2Eligible ? referral.account.parentAccount!.id : null,
        customerUserId: input.customerUserId,
        conversionStatus: 'PENDING',
        orderAmount: input.orderAmount,
        commissionBase,
        commissionEntries: {
          create: [
            {
              beneficiaryAccountId: referral.account.id,
              beneficiaryType: 'AFFILIATE_TIER_1',
              tierLevel: 1,
              amount: tier1Amount,
              commissionStatus: 'PENDING',
            },
            ...(tier2Eligible
              ? [
                  {
                    beneficiaryAccountId: referral.account.parentAccount!.id,
                    beneficiaryType: 'AFFILIATE_TIER_2' as const,
                    tierLevel: 2,
                    amount: tier2Amount,
                    commissionStatus: 'PENDING' as const,
                  },
                ]
              : []),
          ],
        },
      },
    });
  }

  private async getOrderPayableAmount(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        buyerPayableAmount: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return order.buyerPayableAmount;
  }

  private isReferralEligible(
    referral: {
      expiresAt: Date | null;
      program: {
        scopeType: 'PLATFORM' | 'SHOP' | 'BRAND' | 'PRODUCT_MODEL' | 'OFFER';
        ownerShopId: string | null;
        brandId: string | null;
        productModelId: string | null;
        offerId: string | null;
        programStatus: string;
        startedAt: Date | null;
        endedAt: Date | null;
      };
      account: {
        userId: string;
        accountStatus: string;
      };
    },
    input: {
      customerUserId: string;
      offerId: string;
      sellerShopId: string;
      brandId: string;
      productModelId: string;
    },
  ) {
    const now = new Date();

    if (referral.account.accountStatus !== 'ACTIVE') {
      return false;
    }

    if (referral.account.userId === input.customerUserId) {
      return false;
    }

    if (referral.program.programStatus !== 'ACTIVE') {
      return false;
    }

    if (referral.expiresAt && referral.expiresAt < now) {
      return false;
    }

    if (referral.program.startedAt && referral.program.startedAt > now) {
      return false;
    }

    if (referral.program.endedAt && referral.program.endedAt < now) {
      return false;
    }

    if (referral.program.scopeType === 'SHOP') {
      return referral.program.ownerShopId === input.sellerShopId;
    }

    if (referral.program.scopeType === 'BRAND') {
      return referral.program.brandId === input.brandId;
    }

    if (referral.program.scopeType === 'PRODUCT_MODEL') {
      return referral.program.productModelId === input.productModelId;
    }

    if (referral.program.scopeType === 'OFFER') {
      return referral.program.offerId === input.offerId;
    }

    return false;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  lockOfferInventoryRows(tx: Prisma.TransactionClient, offerId: string) {
    return this.lockOfferInventoryRowsInternal(tx, offerId);
  }

  async decrementOfferAvailableQuantity(tx: Prisma.TransactionClient, offerId: string, quantity: number) {
    const stockUpdateResult = await tx.offer.updateMany({
      where: {
        id: offerId,
        availableQuantity: {
          gte: quantity,
        },
      },
      data: {
        availableQuantity: {
          decrement: quantity,
        },
      },
    });

    return stockUpdateResult.count > 0;
  }

  incrementOfferAvailableQuantity(tx: Prisma.TransactionClient, offerId: string, quantity: number) {
    return tx.offer.update({
      where: { id: offerId },
      data: {
        availableQuantity: {
          increment: quantity,
        },
      },
    });
  }

  consumeOfferBatchAllocations(
    tx: Prisma.TransactionClient,
    offerId: string,
    quantity: number,
  ): Promise<OrderBatchAllocation[]> {
    return this.consumeOfferBatchAllocationsInternal(tx, offerId, quantity);
  }

  restoreOrderItemBatchAllocations(
    tx: Prisma.TransactionClient,
    offerId: string,
    allocations: OrderBatchAllocation[],
  ) {
    return this.restoreOrderItemBatchAllocationsInternal(tx, offerId, allocations);
  }

  private async consumeOfferBatchAllocationsInternal(
    tx: Prisma.TransactionClient,
    offerId: string,
    quantity: number,
  ): Promise<OrderBatchAllocation[]> {
    const links = await tx.offerBatchLink.findMany({
      where: {
        offerId,
        allocatedQuantity: {
          gt: 0,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (links.length === 0) {
      return [];
    }

    const totalAllocatedQuantity = links.reduce((sum, link) => sum + link.allocatedQuantity, 0);
    if (totalAllocatedQuantity < quantity) {
      throw new BadRequestException('Quantity exceeds allocated batch stock');
    }

    let remainingQuantity = quantity;
    const allocations: OrderBatchAllocation[] = [];
    for (const link of links) {
      if (remainingQuantity === 0) {
        break;
      }

      const consumedQuantity = Math.min(link.allocatedQuantity, remainingQuantity);
      if (consumedQuantity <= 0) {
        continue;
      }

      await tx.offerBatchLink.update({
        where: {
          offerId_batchId: {
            offerId,
            batchId: link.batchId,
          },
        },
        data: {
          allocatedQuantity: {
            decrement: consumedQuantity,
          },
        },
      });

      await tx.supplyBatch.update({
        where: {
          id: link.batchId,
        },
        data: {
          quantity: {
            decrement: consumedQuantity,
          },
        },
      });

      allocations.push({
        batchId: link.batchId,
        quantity: consumedQuantity,
      });
      remainingQuantity -= consumedQuantity;
    }

    if (remainingQuantity > 0) {
      throw new BadRequestException('Quantity exceeds allocated batch stock');
    }

    return allocations;
  }

  private async lockOfferInventoryRowsInternal(tx: Prisma.TransactionClient, offerId: string) {
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "offer"
      WHERE "id" = ${offerId}
      FOR UPDATE
    `);

    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "offer_batch_link"
      WHERE "offer_id" = ${offerId}
      ORDER BY "batch_id"
      FOR UPDATE
    `);

    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT sb."id"
      FROM "supply_batch" sb
      INNER JOIN "offer_batch_link" obl
        ON obl."batch_id" = sb."id"
      WHERE obl."offer_id" = ${offerId}
      ORDER BY sb."id"
      FOR UPDATE
    `);
  }

  private async restoreOrderItemBatchAllocationsInternal(
    tx: Prisma.TransactionClient,
    offerId: string,
    allocations: OrderBatchAllocation[],
  ) {
    for (const allocation of allocations) {
      await tx.supplyBatch.update({
        where: {
          id: allocation.batchId,
        },
        data: {
          quantity: {
            increment: allocation.quantity,
          },
        },
      });

      await tx.offerBatchLink.upsert({
        where: {
          offerId_batchId: {
            offerId,
            batchId: allocation.batchId,
          },
        },
        update: {
          allocatedQuantity: {
            increment: allocation.quantity,
          },
        },
        create: {
          offerId,
          batchId: allocation.batchId,
          allocatedQuantity: allocation.quantity,
        },
      });
    }
  }
}
