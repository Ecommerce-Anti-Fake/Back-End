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
        registrationType: true,
        warehouseAddress: true,
        warehouseWardCode: true,
        warehouseWardName: true,
      },
    },
    shippingMethods: {
      where: {
        isEnabled: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    distributionNode: {
      select: {
        id: true,
        networkId: true,
        level: true,
        relationshipStatus: true,
        shop: {
          select: {
            shopStatus: true,
          },
        },
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
    disputes: {
      where: {
        disputeStatus: 'OPEN',
      },
      orderBy: {
        openedAt: 'desc',
      },
      take: 1,
    },
    items: {
      include: {
        batchAllocations: {
          include: {
            batch: {
              select: {
                id: true,
                batchNumber: true,
                sourceName: true,
                countryOfOrigin: true,
                sourceType: true,
                sourceOrderId: true,
                sourceOrderItemId: true,
                receivedAt: true,
              },
            },
          },
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        offer: {
          include: {
            shop: {
              select: {
                id: true,
                shopName: true,
                warehouseAddress: true,
                warehouseWardCode: true,
                warehouseWardName: true,
              },
            },
            media: {
              orderBy: {
                createdAt: 'asc',
              },
              include: {
                mediaAsset: {
                  select: {
                    secureUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

const sellerShopOrderListArgs = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    buyer: {
      select: {
        id: true,
        displayName: true,
        email: true,
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
        disputes: {
          where: {
            disputeStatus: 'OPEN',
          },
          orderBy: {
            openedAt: 'desc',
          },
          take: 1,
        },
        items: {
          include: {
            batchAllocations: {
              include: {
                batch: {
                  select: {
                    id: true,
                    batchNumber: true,
                    sourceName: true,
                    countryOfOrigin: true,
                    sourceType: true,
                    sourceOrderId: true,
                    sourceOrderItemId: true,
                    receivedAt: true,
                  },
                },
              },
            },
            reviews: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
            offer: {
              include: {
                shop: {
                  select: {
                    id: true,
                    shopName: true,
                  },
                },
                shippingMethods: {
                  where: {
                    isEnabled: true,
                  },
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
                media: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                  include: {
                    mediaAsset: {
                      select: {
                        secureUrl: true,
                      },
                    },
                  },
                },
              },
            },
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

const reportWithReporterArgs = Prisma.validator<Prisma.ReportDefaultArgs>()({
  include: {
    reporter: {
      select: {
        id: true,
        displayName: true,
        email: true,
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
      include: {
        offer: {
          include: {
            shop: {
              select: {
                id: true,
                shopName: true,
                warehouseAddress: true,
                warehouseWardCode: true,
                warehouseWardName: true,
              },
            },
            shippingMethods: {
              where: {
                isEnabled: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            media: {
              include: {
                mediaAsset: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  },
});

export type OfferForOrdering = Prisma.OfferGetPayload<typeof offerForOrderingArgs>;
export type OrderWithRelations = Prisma.OrderGetPayload<typeof orderWithRelationsArgs>;
export type SellerShopOrderRecord = Prisma.OrderGetPayload<typeof sellerShopOrderListArgs>;
type FinanceOrderRecord = Prisma.OrderGetPayload<{
  include: {
    shop: {
      select: {
        id: true;
        shopName: true;
      };
    };
    paymentIntent: true;
    escrow: true;
    affiliateConversion: {
      include: {
        commissionEntries: true;
      };
    };
  };
}>;

export type AdminFinanceReconciliationResult = {
  total: number;
  page: number;
  pageSize: number;
  summary: {
    orderCount: number;
    buyerPayableTotal: number;
    platformFeeTotal: number;
    sellerReceivableTotal: number;
    sellerPayoutReadyTotal: number;
    escrowHeldTotal: number;
    escrowFrozenTotal: number;
    refundTotal: number;
    affiliatePendingLiabilityTotal: number;
    affiliatePaidTotal: number;
  };
  items: Array<{
    orderId: string;
    shopId: string;
    shopName: string;
    paymentStatus: string | null;
    escrowStatus: string | null;
    payoutStatus: string;
    buyerPayableAmount: number;
    platformFeeAmount: number;
    sellerReceivableAmount: number;
    sellerPayoutReadyAmount: number;
    refundAmount: number;
    affiliatePendingLiabilityAmount: number;
    affiliatePaidAmount: number;
    createdAt: Date;
  }>;
};

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}
export type CartWithItems = Prisma.CartGetPayload<typeof cartWithItemsArgs>;
export type CheckoutSessionRecord = Prisma.CheckoutSessionGetPayload<Record<string, never>>;
export type OrderBatchAllocation = {
  batchId: string;
  quantity: number;
};
export type CreateOrderRecordInput = {
  buyerUserId: string | null;
  buyerShopId: string | null;
  buyerDistributionNodeId: string | null;
  shopId: string;
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
  shippingDistrictId?: number | null;
  shippingDistrictName?: string | null;
  shippingWardCode?: string | null;
  shippingWardName?: string | null;
  shippingProviderCode?: string | null;
  shippingProviderName?: string | null;
  shippingServiceId?: number | null;
  shippingServiceTypeId?: number | null;
  shippingFeeAmount?: number;
  parcelWeightGrams?: number | null;
  parcelLengthCm?: number | null;
  parcelWidthCm?: number | null;
  parcelHeightCm?: number | null;
  paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS' | 'manual_confirmation' | null;
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
  orderAmount: number;
  commissionBase: number;
};
export type DisputeWithOrder = Prisma.DisputeGetPayload<typeof disputeWithOrderArgs>;
export type DisputeEvidenceRecord = Prisma.DisputeEvidenceGetPayload<typeof disputeEvidenceArgs>;
export type AdminOpenDisputeRecord = Prisma.DisputeGetPayload<typeof openDisputesForAdminArgs>;
export type ReportWithReporter = Prisma.ReportGetPayload<typeof reportWithReporterArgs>;
export type RiskTargetType = 'SHOP' | 'OFFER' | 'BATCH';
export type RiskScoreRecord = Prisma.RiskScoreGetPayload<Record<string, never>>;
export type ModerationCaseRecord = Prisma.ModerationCaseGetPayload<{
  include: {
    assignedAdmin: {
      select: {
        id: true;
        displayName: true;
        email: true;
      };
    };
  };
}>;
export type RiskSignalSnapshot = {
  targetType: RiskTargetType;
  targetId: string;
  targetLabel: string | null;
  openReportCount: number;
  resolvedReportCount: number;
  rejectedReportCount: number;
  openDisputeCount: number;
  refundedDisputeCount: number;
  rejectedDocumentCount: number;
  pendingDocumentCount: number;
  missingProvenance: boolean;
  reviewCount: number;
  averageRating: number | null;
};
export type OrderAuditLogRecord = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  metadata: Prisma.JsonValue | null;
  actorUserId: string;
  createdAt: Date;
  actor: {
    id: string;
    displayName: string | null;
    email: string | null;
  };
};
export type SupplyBatchReceipt = {
  id: string;
  shopId: string;
  brandId: string;
  categoryId: string;
  modelName: string;
  gtin: string | null;
  verificationPolicy: string;
  distributionNodeId: string | null;
  batchNumber: string;
  quantity: number;
  sourceName: string;
  countryOfOrigin: string;
  sourceType: string;
  sourceOrderId: string | null;
  sourceOrderItemId: string | null;
  receivedAt: Date;
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

  async getOfferAllocatedBatchQuantity(offerId: string) {
    const result = await this.prisma.offerBatchLink.aggregate({
      where: {
        offerId,
        allocatedQuantity: {
          gt: 0,
        },
      },
      _sum: {
        allocatedQuantity: true,
      },
    });

    return result._sum.allocatedQuantity ?? 0;
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

  findDefaultAddressByUserId(userId: string) {
    return this.prisma.userAddress.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      orderBy: { createdAt: 'desc' },
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

  async removeCartItems(input: { buyerUserId: string; cartItemIds: string[] }): Promise<CartWithItems> {
    const cart = await this.getOrCreateActiveCart(input.buyerUserId);
    const selectedIds = new Set(input.cartItemIds);
    const selectedItems = cart.items.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length !== selectedIds.size) {
      throw new BadRequestException('One or more cart items are invalid');
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        id: {
          in: [...selectedIds],
        },
      },
    });

    return this.getOrCreateActiveCart(input.buyerUserId);
  }

  createCheckoutSession(input: {
    buyerUserId: string;
    cartItemIds: string[];
    shippingOptionCode: string;
    paymentMethod: 'PAYOS';
    amount: number;
  }): Promise<CheckoutSessionRecord> {
    return this.prisma.checkoutSession.create({
      data: {
        buyerUserId: input.buyerUserId,
        cartItemIds: input.cartItemIds,
        shippingOptionCode: input.shippingOptionCode,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
      },
    });
  }

  updateCheckoutSessionPaymentProviderRef(input: {
    checkoutSessionId: string;
    paymentProviderRef: string;
  }): Promise<CheckoutSessionRecord> {
    return this.prisma.checkoutSession.update({
      where: { id: input.checkoutSessionId },
      data: {
        paymentProviderRef: input.paymentProviderRef,
      },
    });
  }

  findCheckoutSessionByPaymentProviderRef(paymentProviderRef: string): Promise<CheckoutSessionRecord | null> {
    return this.prisma.checkoutSession.findUnique({
      where: { paymentProviderRef },
    });
  }

  markCheckoutSessionPaid(id: string): Promise<CheckoutSessionRecord> {
    return this.prisma.checkoutSession.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        completedAt: new Date(),
      },
    });
  }

  markCheckoutSessionFailed(id: string): Promise<CheckoutSessionRecord> {
    return this.prisma.checkoutSession.update({
      where: { id },
      data: {
        paymentStatus: 'FAILED',
        failedAt: new Date(),
      },
    });
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

  findShopReportTarget(shopId: string) {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopName: true,
      },
    });
  }

  findOfferReportTarget(offerId: string) {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        title: true,
        shopId: true,
      },
    });
  }

  findSocialPostReportTarget(postId: string) {
    return this.prisma.socialPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorUserId: true,
        body: true,
        visibility: true,
      },
    });
  }

  findSocialCommentReportTarget(commentId: string) {
    return this.prisma.socialComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        postId: true,
        authorUserId: true,
        body: true,
        visibility: true,
        post: {
          select: {
            id: true,
            visibility: true,
          },
        },
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
        parentNodeId: true,
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
        shippingDistrictId: data.shippingDistrictId ?? null,
        shippingDistrictName: data.shippingDistrictName ?? null,
        shippingWardCode: data.shippingWardCode ?? null,
        shippingWardName: data.shippingWardName ?? null,
        shippingProviderCode: data.shippingProviderCode ?? null,
        shippingProviderName: data.shippingProviderName ?? null,
        shippingServiceId: data.shippingServiceId ?? null,
        shippingServiceTypeId: data.shippingServiceTypeId ?? null,
        shippingFeeAmount: data.shippingFeeAmount ?? 0,
        parcelWeightGrams: data.parcelWeightGrams ?? null,
        parcelLengthCm: data.parcelLengthCm ?? null,
        parcelWidthCm: data.parcelWidthCm ?? null,
        parcelHeightCm: data.parcelHeightCm ?? null,
        items: {
          create: {
            ...data.item,
            batchAllocations: batchAllocations.length ? { create: batchAllocations } : undefined,
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

  async updatePaymentStatusWithAudit(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      actorUserId: string;
      paymentStatus: 'CANCELLED' | 'REFUNDED';
    },
  ) {
    const paymentIntent = await tx.paymentIntent.findUnique({
      where: { orderId: input.orderId },
      select: {
        paymentMethod: true,
        paymentStatus: true,
      },
    });
    const fromStatus = paymentIntent?.paymentStatus ?? 'PENDING';

    await tx.paymentIntent.update({
      where: { orderId: input.orderId },
      data: {
        paymentStatus: input.paymentStatus,
      },
    });

    return tx.auditLog.create({
      data: {
        targetType: 'ORDER',
        targetId: input.orderId,
        actorUserId: input.actorUserId,
        action: 'PAYMENT_STATUS_CHANGED',
        fromStatus,
        toStatus: input.paymentStatus,
        note: `Payment moved from ${fromStatus} to ${input.paymentStatus}`,
        metadata: {
          domain: 'PAYMENT',
          paymentMethod: paymentIntent?.paymentMethod ?? null,
        },
      },
    });
  }

  async updateEscrowStatusWithAudit(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      actorUserId: string;
      escrowStatus: 'HELD' | 'FROZEN' | 'RELEASED' | 'CANCELLED' | 'REFUNDED';
      heldAmount?: Prisma.Decimal | number | null;
      note?: string | null;
    },
  ) {
    const now = new Date();
    const existing = await tx.escrow.findUnique({
      where: { orderId: input.orderId },
      select: {
        escrowStatus: true,
        heldAmount: true,
      },
    });
    const heldAmount = input.heldAmount ?? existing?.heldAmount ?? 0;
    const releaseAt = ['RELEASED', 'CANCELLED', 'REFUNDED'].includes(input.escrowStatus) ? now : null;
    const holdAt = input.escrowStatus === 'HELD' && !existing ? now : undefined;

    await tx.escrow.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        escrowStatus: input.escrowStatus,
        heldAmount,
        holdAt: input.escrowStatus === 'HELD' ? now : null,
        releaseAt,
      },
      update: {
        escrowStatus: input.escrowStatus,
        heldAmount,
        holdAt,
        releaseAt,
      },
    });

    if (existing?.escrowStatus === input.escrowStatus) {
      return;
    }

    await tx.auditLog.create({
      data: {
        targetType: 'ORDER',
        targetId: input.orderId,
        actorUserId: input.actorUserId,
        action: 'ESCROW_STATUS_CHANGED',
        fromStatus: existing?.escrowStatus ?? null,
        toStatus: input.escrowStatus,
        note: input.note ?? `Escrow moved from ${existing?.escrowStatus ?? '-'} to ${input.escrowStatus}`,
        metadata: {
          domain: 'ESCROW',
          heldAmount: heldAmount.toString(),
        },
      },
    });
  }

  updateEscrowStatusForOrder(input: {
    orderId: string;
    actorUserId: string;
    escrowStatus: 'HELD' | 'FROZEN' | 'RELEASED' | 'CANCELLED' | 'REFUNDED';
    note?: string | null;
  }) {
    return this.prisma.$transaction((tx) => this.updateEscrowStatusWithAudit(tx, input));
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

  bookOrderShipping(input: {
    id: string;
    actorUserId: string;
    trackingCode: string;
    providerStatus: string;
  }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: input.id },
        select: {
          fulfillmentStatus: true,
          shippingTrackingCode: true,
          shippingProviderCode: true,
        },
      });
      const fromStatus = currentOrder?.fulfillmentStatus ?? 'PROCESSING';

      await tx.auditLog.create({
        data: {
          targetType: 'ORDER',
          targetId: input.id,
          actorUserId: input.actorUserId,
          action: 'SHIPPING_BOOKED',
          fromStatus,
          toStatus: 'SHIPPING',
          note: `Shipping booked with tracking ${input.trackingCode}`,
          metadata: {
            domain: 'FULFILLMENT',
            shippingProviderCode: currentOrder?.shippingProviderCode ?? null,
            previousTrackingCode: currentOrder?.shippingTrackingCode ?? null,
            providerStatus: input.providerStatus,
          },
        },
      });

      return tx.order.update({
        where: { id: input.id },
        data: {
          fulfillmentStatus: 'SHIPPING',
          shippingTrackingCode: input.trackingCode,
        },
        ...orderWithRelationsArgs,
      });
    });
  }

  async receiveWholesaleOrderIntoInventory(order: OrderWithRelations): Promise<SupplyBatchReceipt[]> {
    if (!order.buyerShopId || !order.buyerDistributionNodeId) {
      throw new BadRequestException('Wholesale buyer distribution node is required');
    }

    const buyerShopId = order.buyerShopId;
    const buyerDistributionNodeId = order.buyerDistributionNodeId;

    return this.prisma.$transaction(async (tx) => {
      const receipts: SupplyBatchReceipt[] = [];

      for (const item of order.items) {
        const batchNumber = this.wholesaleReceiptBatchNumber(order.id, item.id);
        const existingBatch = await tx.supplyBatch.findFirst({
          where: {
            shopId: buyerShopId,
            distributionNodeId: buyerDistributionNodeId,
            batchNumber,
          },
        });

        if (existingBatch) {
          receipts.push(existingBatch);
          continue;
        }

        receipts.push(
          await tx.supplyBatch.create({
            data: {
              shopId: buyerShopId,
              brandId: item.offer.brandId,
              categoryId: item.offer.categoryId,
              modelName: item.offer.modelName,
              gtin: item.offer.gtin,
              verificationPolicy: item.offer.verificationPolicy,
              distributionNodeId: buyerDistributionNodeId,
              batchNumber,
              quantity: item.quantity,
              sourceName: order.shop.shopName,
              countryOfOrigin: 'UNKNOWN',
              sourceType: 'WHOLESALE_ORDER',
              sourceOrderId: order.id,
              sourceOrderItemId: item.id,
              receivedAt: new Date(),
            },
          }),
        );
      }

      return receipts;
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

  async getSellerShopOrderStatusSummary(input: { requesterUserId: string; shopId: string }) {
    const shop = await this.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new BadRequestException('Shop does not belong to current user');
    }

    const shopWhere: Prisma.OrderWhereInput = { shopId: input.shopId };
    const [totalOrders, pendingOrders, shippingOrders, completedOrders] = await this.prisma.$transaction([
      this.prisma.order.count({ where: shopWhere }),
      this.prisma.order.count({ where: { ...shopWhere, fulfillmentStatus: 'PENDING' } }),
      this.prisma.order.count({ where: { ...shopWhere, fulfillmentStatus: 'SHIPPING' } }),
      this.prisma.order.count({
        where: {
          ...shopWhere,
          OR: [{ orderStatus: 'completed' }, { fulfillmentStatus: 'DELIVERED' }],
        },
      }),
    ]);

    return { totalOrders, pendingOrders, shippingOrders, completedOrders };
  }

  async findSellerShopOrders(input: {
    requesterUserId: string;
    shopId: string;
    orderStatus?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ total: number; page: number; pageSize: number; items: SellerShopOrderRecord[] }> {
    const shop = await this.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new BadRequestException('Shop does not belong to current user');
    }

    const page = Math.max(1, Number(input.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(input.pageSize ?? 20)));
    const normalizedStatus = input.orderStatus?.trim();
    const where: Prisma.OrderWhereInput = {
      shopId: input.shopId,
      ...(normalizedStatus && normalizedStatus !== 'all' ? { orderStatus: normalizedStatus } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...sellerShopOrderListArgs,
      }),
    ]);

    return { total, page, pageSize, items };
  }

  allocateOrderBatchesAndUpdateFulfillment(id: string, fulfillmentStatus: string): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await this.allocateOrderBatchesForFulfillment(tx, id);

      return tx.order.update({
        where: { id },
        data: {
          fulfillmentStatus,
        },
        ...orderWithRelationsArgs,
      });
    });
  }

  async findAdminOrders(input?: {
    orderStatus?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ total: number; page: number; pageSize: number; items: OrderWithRelations[] }> {
    const page = Math.max(1, Number(input?.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(input?.pageSize ?? 20)));
    const where: Prisma.OrderWhereInput = {
      ...(input?.orderStatus ? { orderStatus: input.orderStatus } : {}),
      ...(input?.paymentStatus
        ? {
            paymentIntent: {
              is: {
                paymentStatus: input.paymentStatus,
              },
            },
          }
        : {}),
      ...(input?.search
        ? {
            OR: [
              { id: { contains: input.search, mode: 'insensitive' } },
              { shop: { is: { shopName: { contains: input.search, mode: 'insensitive' } } } },
              { shippingName: { contains: input.search, mode: 'insensitive' } },
              { shippingPhone: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: {
          createdAt: input?.sortOrder ?? 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...orderWithRelationsArgs,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items,
    };
  }

  async findAdminFinanceReconciliation(input?: {
    fromDate?: string;
    toDate?: string;
    shopId?: string;
    orderId?: string;
    paymentStatus?: string;
    escrowStatus?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<AdminFinanceReconciliationResult> {
    const page = Math.max(1, Number(input?.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(input?.pageSize ?? 20)));
    const createdAt: Prisma.DateTimeFilter = {
      ...(input?.fromDate ? { gte: new Date(input.fromDate) } : {}),
      ...(input?.toDate ? { lte: new Date(input.toDate) } : {}),
    };
    const where: Prisma.OrderWhereInput = {
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(input?.shopId ? { shopId: input.shopId } : {}),
      ...(input?.orderId ? { id: { contains: input.orderId, mode: 'insensitive' } } : {}),
      ...(input?.paymentStatus
        ? {
            paymentIntent: {
              is: {
                paymentStatus: input.paymentStatus,
              },
            },
          }
        : {}),
      ...(input?.escrowStatus
        ? {
            escrow: {
              is: {
                escrowStatus: input.escrowStatus,
              },
            },
          }
        : {}),
    };

    const include = {
      shop: {
        select: {
          id: true,
          shopName: true,
        },
      },
      paymentIntent: true,
      escrow: true,
      affiliateConversion: {
        include: {
          commissionEntries: true,
        },
      },
    } satisfies Prisma.OrderInclude;

    const [total, summaryOrders, pageOrders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include,
      }),
      this.prisma.order.findMany({
        where,
        orderBy: {
          createdAt: input?.sortOrder ?? 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      summary: this.buildFinanceSummary(summaryOrders),
      items: pageOrders.map((order) => this.toFinanceReconciliationRecord(order)),
    };
  }

  private buildFinanceSummary(orders: FinanceOrderRecord[]): AdminFinanceReconciliationResult['summary'] {
    return orders.reduce(
      (summary, order) => {
        const record = this.toFinanceReconciliationRecord(order);

        summary.buyerPayableTotal += record.buyerPayableAmount;
        summary.platformFeeTotal += record.platformFeeAmount;
        summary.sellerReceivableTotal += record.sellerReceivableAmount;
        summary.sellerPayoutReadyTotal += record.sellerPayoutReadyAmount;
        summary.escrowHeldTotal += order.escrow?.escrowStatus === 'HELD' ? decimalToNumber(order.escrow.heldAmount) : 0;
        summary.escrowFrozenTotal += order.escrow?.escrowStatus === 'FROZEN' ? decimalToNumber(order.escrow.heldAmount) : 0;
        summary.refundTotal += record.refundAmount;
        summary.affiliatePendingLiabilityTotal += record.affiliatePendingLiabilityAmount;
        summary.affiliatePaidTotal += record.affiliatePaidAmount;

        return summary;
      },
      {
        orderCount: orders.length,
        buyerPayableTotal: 0,
        platformFeeTotal: 0,
        sellerReceivableTotal: 0,
        sellerPayoutReadyTotal: 0,
        escrowHeldTotal: 0,
        escrowFrozenTotal: 0,
        refundTotal: 0,
        affiliatePendingLiabilityTotal: 0,
        affiliatePaidTotal: 0,
      },
    );
  }

  private toFinanceReconciliationRecord(order: FinanceOrderRecord): AdminFinanceReconciliationResult['items'][number] {
    const paymentStatus = order.paymentIntent?.paymentStatus ?? null;
    const escrowStatus = order.escrow?.escrowStatus ?? null;
    const sellerReceivableAmount = decimalToNumber(order.sellerReceivableAmount);
    const payoutStatus = this.resolveSellerPayoutStatus(paymentStatus, escrowStatus);
    const commissionEntries = order.affiliateConversion?.commissionEntries ?? [];
    const affiliatePendingLiabilityAmount = commissionEntries
      .filter((entry) => ['PENDING', 'APPROVED', 'LOCKED'].includes(entry.commissionStatus))
      .reduce((total, entry) => total + decimalToNumber(entry.amount), 0);
    const affiliatePaidAmount = commissionEntries
      .filter((entry) => entry.commissionStatus === 'PAID')
      .reduce((total, entry) => total + decimalToNumber(entry.amount), 0);

    return {
      orderId: order.id,
      shopId: order.shopId,
      shopName: order.shop.shopName,
      paymentStatus,
      escrowStatus,
      payoutStatus,
      buyerPayableAmount: decimalToNumber(order.buyerPayableAmount),
      platformFeeAmount: decimalToNumber(order.platformFeeAmount),
      sellerReceivableAmount,
      sellerPayoutReadyAmount: payoutStatus === 'READY_FOR_PAYOUT' ? sellerReceivableAmount : 0,
      refundAmount: paymentStatus === 'REFUNDED' || escrowStatus === 'REFUNDED' ? decimalToNumber(order.buyerPayableAmount) : 0,
      affiliatePendingLiabilityAmount,
      affiliatePaidAmount,
      createdAt: order.createdAt,
    };
  }

  private resolveSellerPayoutStatus(paymentStatus: string | null, escrowStatus: string | null): string {
    if (paymentStatus === 'REFUNDED' || escrowStatus === 'REFUNDED') {
      return 'REFUNDED';
    }
    if (paymentStatus === 'CANCELLED' || escrowStatus === 'CANCELLED') {
      return 'CANCELLED';
    }
    if (escrowStatus === 'FROZEN') {
      return 'FROZEN';
    }
    if (escrowStatus === 'RELEASED') {
      return 'READY_FOR_PAYOUT';
    }
    if (escrowStatus === 'HELD') {
      return 'HELD_IN_ESCROW';
    }

    return 'NOT_READY';
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

  findOpenReportByTarget(input: { reporterUserId: string; targetType: string; targetId: string }) {
    return this.prisma.report.findFirst({
      where: {
        reporterUserId: input.reporterUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reportStatus: {
          in: ['OPEN', 'IN_REVIEW'],
        },
      },
      select: {
        id: true,
      },
    });
  }

  createReport(input: {
    reporterUserId: string;
    targetType: string;
    targetId: string;
    reason: string;
  }): Promise<ReportWithReporter> {
    return this.prisma.report.create({
      data: {
        reporterUserId: input.reporterUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        reportStatus: 'OPEN',
      },
      ...reportWithReporterArgs,
    });
  }

  findReportsForUser(reporterUserId: string): Promise<ReportWithReporter[]> {
    return this.prisma.report.findMany({
      where: { reporterUserId },
      orderBy: {
        createdAt: 'desc',
      },
      ...reportWithReporterArgs,
    });
  }

  async findReportsForAdmin(filters?: {
    reportStatus?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
    targetType?: 'ORDER' | 'OFFER' | 'SHOP' | 'SOCIAL_POST' | 'SOCIAL_COMMENT';
    search?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ total: number; page: number; pageSize: number; items: ReportWithReporter[] }> {
    const page = Math.max(1, Number(filters?.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(filters?.pageSize ?? 20)));
    const where: Prisma.ReportWhereInput = {
      ...(filters?.reportStatus ? { reportStatus: filters.reportStatus } : { reportStatus: { in: ['OPEN', 'IN_REVIEW'] } }),
      ...(filters?.targetType ? { targetType: filters.targetType } : {}),
      ...(filters?.search
        ? {
            OR: [
              { reason: { contains: filters.search, mode: 'insensitive' } },
              { targetId: { contains: filters.search, mode: 'insensitive' } },
              { reporter: { is: { email: { contains: filters.search, mode: 'insensitive' } } } },
              { reporter: { is: { displayName: { contains: filters.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: {
          createdAt: filters?.sortOrder ?? 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...reportWithReporterArgs,
      }),
    ]);

    return { total, page, pageSize, items };
  }

  findReportById(id: string): Promise<ReportWithReporter | null> {
    return this.prisma.report.findUnique({
      where: { id },
      ...reportWithReporterArgs,
    });
  }

  updateReportStatus(input: {
    id: string;
    reportStatus: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  }): Promise<ReportWithReporter> {
    return this.prisma.report.update({
      where: { id: input.id },
      data: {
        reportStatus: input.reportStatus,
      },
      ...reportWithReporterArgs,
    });
  }

  async updateSocialReportTargetVisibility(input: {
    targetType: string;
    targetId: string;
    visibility: 'PUBLIC' | 'HIDDEN';
    actorUserId: string;
  }) {
    if (input.targetType === 'SOCIAL_POST') {
      return this.prisma.socialPost.update({
        where: { id: input.targetId },
        data: {
          visibility: input.visibility,
          hiddenAt: input.visibility === 'HIDDEN' ? new Date() : null,
          hiddenByUserId: input.visibility === 'HIDDEN' ? input.actorUserId : null,
        },
        select: { id: true },
      });
    }

    if (input.targetType === 'SOCIAL_COMMENT') {
      return this.prisma.socialComment.update({
        where: { id: input.targetId },
        data: {
          visibility: input.visibility,
        },
        select: { id: true },
      });
    }

    return null;
  }

  findRiskScoreByTarget(targetType: RiskTargetType, targetId: string): Promise<RiskScoreRecord | null> {
    return this.prisma.riskScore.findFirst({
      where: {
        targetType,
        targetId,
      },
      orderBy: {
        calculatedAt: 'desc',
      },
    });
  }

  async saveRiskScore(input: {
    targetType: RiskTargetType;
    targetId: string;
    score: number;
    riskLevel: string;
    factorSummary: string;
    calculatedAt: Date;
  }): Promise<RiskScoreRecord> {
    const existing = await this.findRiskScoreByTarget(input.targetType, input.targetId);
    const data = {
      score: new Prisma.Decimal(input.score),
      riskLevel: input.riskLevel,
      factorSummary: input.factorSummary,
      calculatedAt: input.calculatedAt,
    };

    if (existing) {
      return this.prisma.riskScore.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.riskScore.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        ...data,
      },
    });
  }

  async findRiskScoresForAdmin(filters?: {
    targetType?: RiskTargetType;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    search?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ total: number; page: number; pageSize: number; items: RiskScoreRecord[] }> {
    const page = Math.max(1, Number(filters?.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(filters?.pageSize ?? 20)));
    const where: Prisma.RiskScoreWhereInput = {
      ...(filters?.targetType ? { targetType: filters.targetType } : {}),
      ...(filters?.riskLevel ? { riskLevel: filters.riskLevel } : {}),
      ...(filters?.search
        ? {
            OR: [
              { targetId: { contains: filters.search, mode: 'insensitive' } },
              { factorSummary: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.riskScore.count({ where }),
      this.prisma.riskScore.findMany({
        where,
        orderBy: {
          calculatedAt: filters?.sortOrder ?? 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async getRiskSignals(targetType: RiskTargetType, targetId: string): Promise<RiskSignalSnapshot | null> {
    if (targetType === 'SHOP') {
      return this.getShopRiskSignals(targetId);
    }
    if (targetType === 'OFFER') {
      return this.getOfferRiskSignals(targetId);
    }
    return this.getBatchRiskSignals(targetId);
  }

  async resolveRiskTargetsForReport(input: { targetType: string; targetId: string }): Promise<Array<{ targetType: RiskTargetType; targetId: string }>> {
    if (input.targetType === 'SHOP') {
      return [{ targetType: 'SHOP', targetId: input.targetId }];
    }

    if (input.targetType === 'OFFER') {
      const offer = await this.prisma.offer.findUnique({
        where: { id: input.targetId },
        include: {
          batchLinks: {
            select: { batchId: true },
          },
        },
      });
      if (!offer) return [];
      return this.dedupeRiskTargets([
        { targetType: 'OFFER', targetId: offer.id },
        { targetType: 'SHOP', targetId: offer.shopId },
        ...offer.batchLinks.map((link) => ({ targetType: 'BATCH' as const, targetId: link.batchId })),
      ]);
    }

    if (input.targetType === 'ORDER') {
      const order = await this.prisma.order.findUnique({
        where: { id: input.targetId },
        include: {
          items: {
            include: {
              batchAllocations: {
                select: { batchId: true },
              },
            },
          },
        },
      });
      if (!order) return [];
      return this.dedupeRiskTargets([
        { targetType: 'SHOP', targetId: order.shopId },
        ...order.items.map((item) => ({ targetType: 'OFFER' as const, targetId: item.offerId })),
        ...order.items.flatMap((item) =>
          item.batchAllocations.map((allocation) => ({ targetType: 'BATCH' as const, targetId: allocation.batchId })),
        ),
      ]);
    }

    return [];
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

  findModerationCaseById(id: string): Promise<ModerationCaseRecord | null> {
    return this.prisma.moderationCase.findUnique({
      where: { id },
      include: {
        assignedAdmin: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async findModerationCasesForAdmin(filters?: {
    targetType?: string;
    caseStatus?: string;
    assignedAdminUserId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ total: number; page: number; pageSize: number; items: ModerationCaseRecord[] }> {
    const page = Math.max(1, Number(filters?.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(filters?.pageSize ?? 20)));
    const where: Prisma.ModerationCaseWhereInput = {
      ...(filters?.targetType ? { targetType: filters.targetType } : {}),
      ...(filters?.caseStatus ? { caseStatus: filters.caseStatus } : {}),
      ...(filters?.assignedAdminUserId ? { assignedAdminUserId: filters.assignedAdminUserId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { targetId: { contains: filters.search, mode: 'insensitive' } },
              { reason: { contains: filters.search, mode: 'insensitive' } },
              { internalNote: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const include = {
      assignedAdmin: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    } satisfies Prisma.ModerationCaseInclude;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.moderationCase.count({ where }),
      this.prisma.moderationCase.findMany({
        where,
        include,
        orderBy: {
          createdAt: filters?.sortOrder ?? 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, items };
  }

  updateModerationCase(input: {
    id: string;
    caseStatus: string;
    internalNote?: string | null;
    assignedAdminUserId?: string | null;
    resolvedAt?: Date | null;
  }): Promise<ModerationCaseRecord> {
    return this.prisma.moderationCase.update({
      where: { id: input.id },
      data: {
        caseStatus: input.caseStatus,
        internalNote: input.internalNote ?? null,
        assignedAdminUserId: input.assignedAdminUserId ?? null,
        resolvedAt: input.resolvedAt ?? null,
      },
      include: {
        assignedAdmin: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async upsertRiskModerationCase(input: {
    targetType: RiskTargetType;
    targetId: string;
    riskLevel: 'HIGH' | 'CRITICAL';
    score: number;
    reason: string;
    internalNote?: string | null;
  }) {
    const existing = await this.findModerationCaseByTarget(input.targetType, input.targetId);
    const caseStatus = input.riskLevel === 'CRITICAL' ? 'ESCALATED' : 'IN_REVIEW';

    if (!existing || ['RESOLVED', 'CLOSED'].includes(existing.caseStatus)) {
      return this.prisma.moderationCase.create({
        data: {
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          caseStatus,
          internalNote: input.internalNote ?? `Risk score ${input.riskLevel} (${input.score})`,
        },
      });
    }

    const nextStatus = existing.caseStatus === 'ESCALATED' ? 'ESCALATED' : caseStatus;
    return this.prisma.moderationCase.update({
      where: { id: existing.id },
      data: {
        reason: input.reason,
        caseStatus: nextStatus,
        internalNote: input.internalNote ?? existing.internalNote ?? `Risk score ${input.riskLevel} (${input.score})`,
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
          metadata: Prisma.JsonValue | null;
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
          al.metadata,
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
          metadata: row.metadata,
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

  async upsertReportModerationCase(input: {
    reportId: string;
    caseStatus: string;
    internalNote?: string | null;
    reason: string;
    assignedAdminUserId?: string | null;
    resolvedAt?: Date | null;
  }) {
    const existing = await this.findModerationCaseByTarget('REPORT', input.reportId);

    if (!existing) {
      return this.prisma.moderationCase.create({
        data: {
          targetType: 'REPORT',
          targetId: input.reportId,
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

  createNotification(input: {
    userId: string;
    notificationType: string;
    title: string;
    body: string;
    targetType: string;
    targetId: string;
    dedupeKey: string;
  }) {
    return this.prisma.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: input,
      update: {},
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

  async markOrderPaid(input: { id: string; actorUserId: string; providerRef: string | null }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const heldAmount = await this.getOrderPayableAmount(tx, input.id);
      const paymentIntent = await tx.paymentIntent.findUnique({
        where: { orderId: input.id },
        select: {
          paymentMethod: true,
          paymentStatus: true,
        },
      });
      const fromStatus = paymentIntent?.paymentStatus ?? 'PENDING';

      await tx.paymentIntent.update({
        where: { orderId: input.id },
        data: {
          paymentStatus: 'PAID',
          providerRef: input.providerRef,
        },
      });

      await this.updateEscrowStatusWithAudit(tx, {
        orderId: input.id,
        actorUserId: input.actorUserId,
        escrowStatus: 'HELD',
        heldAmount,
        note: `Escrow held after payment moved from ${fromStatus} to PAID`,
      });

      await tx.auditLog.create({
        data: {
          targetType: 'ORDER',
          targetId: input.id,
          actorUserId: input.actorUserId,
          action: 'PAYMENT_STATUS_CHANGED',
          fromStatus,
          toStatus: 'PAID',
          note: `Payment moved from ${fromStatus} to PAID`,
          metadata: {
            domain: 'PAYMENT',
            paymentMethod: paymentIntent?.paymentMethod ?? null,
          },
        },
      });

      return tx.order.update({
        where: { id: input.id },
        data: {
          orderStatus: 'paid',
          fulfillmentStatus: 'PENDING',
        },
        ...orderWithRelationsArgs,
      });
    });
  }

  async markOrderPaymentFailed(input: {
    id: string;
    actorUserId: string;
    providerRef: string | null;
    reason: string | null;
  }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const paymentIntent = await tx.paymentIntent.findUnique({
        where: { orderId: input.id },
        select: {
          paymentMethod: true,
          paymentStatus: true,
        },
      });
      const fromStatus = paymentIntent?.paymentStatus ?? 'PENDING';

      await tx.paymentIntent.update({
        where: { orderId: input.id },
        data: {
          paymentStatus: 'FAILED',
          providerRef: input.providerRef,
        },
      });

      await tx.auditLog.create({
        data: {
          targetType: 'ORDER',
          targetId: input.id,
          actorUserId: input.actorUserId,
          action: 'PAYMENT_STATUS_CHANGED',
          fromStatus,
          toStatus: 'FAILED',
          note: input.reason || `Payment moved from ${fromStatus} to FAILED`,
          metadata: {
            domain: 'PAYMENT',
            paymentMethod: paymentIntent?.paymentMethod ?? null,
          },
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: input.id },
        ...orderWithRelationsArgs,
      });
    });
  }

  updatePaymentProviderRef(orderId: string, providerRef: string): Promise<unknown> {
    return this.prisma.paymentIntent.update({
      where: { orderId },
      data: { providerRef },
    });
  }

  async updatePaymentProviderRefAndStatus(input: {
    orderId: string;
    actorUserId: string;
    providerRef: string;
    paymentStatus: 'PENDING';
    note: string;
  }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const paymentIntent = await tx.paymentIntent.findUnique({
        where: { orderId: input.orderId },
        select: {
          paymentMethod: true,
          paymentStatus: true,
        },
      });
      const fromStatus = paymentIntent?.paymentStatus ?? 'FAILED';

      await tx.paymentIntent.update({
        where: { orderId: input.orderId },
        data: {
          providerRef: input.providerRef,
          paymentStatus: input.paymentStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          targetType: 'ORDER',
          targetId: input.orderId,
          actorUserId: input.actorUserId,
          action: 'PAYMENT_STATUS_CHANGED',
          fromStatus,
          toStatus: input.paymentStatus,
          note: input.note,
          metadata: {
            domain: 'PAYMENT',
            event: 'PAYOS_PAYMENT_RETRY',
            paymentMethod: paymentIntent?.paymentMethod ?? 'PAYOS',
            providerConfirmation: false,
          },
        },
      });

      return tx.order.findUnique({
        where: { id: input.orderId },
        ...orderWithRelationsArgs,
      });
    }).then((order) => {
      if (!order) {
        throw new BadRequestException('Order not found');
      }
      return order;
    });
  }

  findOrderByPaymentProviderRef(providerRef: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findFirst({
      where: {
        paymentIntent: {
          providerRef,
        },
      },
      ...orderWithRelationsArgs,
    });
  }

  async completeOrder(input: { id: string; actorUserId: string }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await this.updateEscrowStatusWithAudit(tx, {
        orderId: input.id,
        actorUserId: input.actorUserId,
        escrowStatus: 'RELEASED',
        note: 'Escrow released after seller completed delivered order',
      });

      return tx.order.update({
        where: { id: input.id },
        data: {
          orderStatus: 'completed',
          fulfillmentStatus: 'DELIVERED',
        },
        ...orderWithRelationsArgs,
      });
    });
  }

  private async getShopRiskSignals(shopId: string): Promise<RiskSignalSnapshot | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        documents: { select: { reviewStatus: true } },
        registeredCategories: {
          include: {
            documents: { select: { reviewStatus: true } },
          },
        },
        brandAuthorizations: { select: { verificationStatus: true } },
      },
    });
    if (!shop) return null;

    const reportCounts = await this.countReportsForTarget('SHOP', shopId);
    const disputeCounts = await this.countDisputesForWhere({ order: { is: { shopId } } });
    const rating = await this.prisma.review.aggregate({
      where: { toUserId: shop.ownerUserId },
      _avg: { rating: true },
      _count: { id: true },
    });
    const statuses = [
      shop.shopStatus,
      ...shop.documents.map((doc) => doc.reviewStatus),
      ...shop.registeredCategories.flatMap((category) => category.documents.map((doc) => doc.reviewStatus)),
      ...shop.brandAuthorizations.map((authorization) => authorization.verificationStatus),
    ];

    return {
      targetType: 'SHOP',
      targetId: shop.id,
      targetLabel: shop.shopName,
      ...reportCounts,
      ...disputeCounts,
      ...this.countDocumentStatuses(statuses),
      missingProvenance: false,
      reviewCount: rating._count.id ?? 0,
      averageRating: rating._avg.rating ? Number(rating._avg.rating) : null,
    };
  }

  private async getOfferRiskSignals(offerId: string): Promise<RiskSignalSnapshot | null> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        documents: { select: { reviewStatus: true } },
        batchLinks: { select: { batchId: true } },
      },
    });
    if (!offer) return null;

    const reportCounts = await this.countReportsForTarget('OFFER', offerId);
    const disputeCounts = await this.countDisputesForWhere({ order: { is: { items: { some: { offerId } } } } });
    const rating = await this.prisma.review.aggregate({
      where: {
        orderItem: {
          is: {
            offerId,
          },
        },
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    return {
      targetType: 'OFFER',
      targetId: offer.id,
      targetLabel: offer.title,
      ...reportCounts,
      ...disputeCounts,
      ...this.countDocumentStatuses(offer.documents.map((doc) => doc.reviewStatus)),
      missingProvenance: offer.batchLinks.length === 0,
      reviewCount: rating._count.id ?? 0,
      averageRating: rating._avg.rating ? Number(rating._avg.rating) : null,
    };
  }

  private async getBatchRiskSignals(batchId: string): Promise<RiskSignalSnapshot | null> {
    const batch = await this.prisma.supplyBatch.findUnique({
      where: { id: batchId },
      include: {
        documents: { select: { reviewStatus: true } },
      },
    });
    if (!batch) return null;

    const reportCounts = await this.countReportsForTarget('BATCH', batchId);
    const disputeCounts = await this.countDisputesForWhere({
      order: {
        is: {
          items: {
            some: {
              batchAllocations: {
                some: { batchId },
              },
            },
          },
        },
      },
    });

    return {
      targetType: 'BATCH',
      targetId: batch.id,
      targetLabel: batch.batchNumber || batch.sourceName,
      ...reportCounts,
      ...disputeCounts,
      ...this.countDocumentStatuses(batch.documents.map((doc) => doc.reviewStatus)),
      missingProvenance: !batch.sourceOrderItemId && String(batch.sourceType || '').toUpperCase() !== 'MANUFACTURER',
      reviewCount: 0,
      averageRating: null,
    };
  }

  private async countReportsForTarget(targetType: string, targetId: string) {
    const [openReportCount, resolvedReportCount, rejectedReportCount] = await this.prisma.$transaction([
      this.prisma.report.count({
        where: {
          targetType,
          targetId,
          reportStatus: { in: ['OPEN', 'IN_REVIEW'] },
        },
      }),
      this.prisma.report.count({
        where: {
          targetType,
          targetId,
          reportStatus: 'RESOLVED',
        },
      }),
      this.prisma.report.count({
        where: {
          targetType,
          targetId,
          reportStatus: 'REJECTED',
        },
      }),
    ]);

    return { openReportCount, resolvedReportCount, rejectedReportCount };
  }

  private async countDisputesForWhere(where: Prisma.DisputeWhereInput) {
    const [openDisputeCount, refundedDisputeCount] = await this.prisma.$transaction([
      this.prisma.dispute.count({
        where: {
          ...where,
          disputeStatus: 'OPEN',
        },
      }),
      this.prisma.dispute.count({
        where: {
          ...where,
          disputeStatus: 'REFUNDED',
        },
      }),
    ]);

    return { openDisputeCount, refundedDisputeCount };
  }

  private countDocumentStatuses(statuses: string[]) {
    const normalized = statuses.map((status) => String(status || '').toUpperCase());
    return {
      rejectedDocumentCount: normalized.filter((status) => ['REJECTED', 'DENIED', 'SUSPENDED'].includes(status)).length,
      pendingDocumentCount: normalized.filter((status) => ['PENDING', 'PENDING_VERIFICATION', 'IN_REVIEW', 'SUBMITTED'].includes(status)).length,
    };
  }

  private dedupeRiskTargets(targets: Array<{ targetType: RiskTargetType; targetId: string }>) {
    const seen = new Set<string>();
    return targets.filter((target) => {
      const key = `${target.targetType}:${target.targetId}`;
      if (!target.targetId || seen.has(key)) return false;
      seen.add(key);
      return true;
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
        scopeType: 'PLATFORM' | 'SHOP' | 'BRAND' | 'OFFER';
        ownerShopId: string | null;
        brandId: string | null;
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

  private wholesaleReceiptBatchNumber(orderId: string, orderItemId: string) {
    return `WHOLESALE-${orderId.slice(0, 8).toUpperCase()}-${orderItemId.slice(0, 8).toUpperCase()}`;
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
    shopId?: string,
  ): Promise<OrderBatchAllocation[]> {
    const links = await tx.offerBatchLink.findMany({
      where: {
        offerId,
        allocatedQuantity: {
          gt: 0,
        },
        ...(shopId
          ? {
              batch: {
                shopId,
              },
            }
          : {}),
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

  private async allocateOrderBatchesForFulfillment(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        shopId: true,
        items: {
          select: {
            id: true,
            offerId: true,
            quantity: true,
            batchAllocations: {
              select: {
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    for (const item of order.items) {
      const allocatedQuantity = item.batchAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      if (allocatedQuantity >= item.quantity) {
        continue;
      }
      if (allocatedQuantity > 0) {
        throw new BadRequestException('Order item has partial batch allocation');
      }

      await this.lockOfferInventoryRowsInternal(tx, item.offerId);
      const allocations = await this.consumeOfferBatchAllocationsInternal(tx, item.offerId, item.quantity, order.shopId);
      const totalAllocatedQuantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      if (totalAllocatedQuantity < item.quantity) {
        throw new BadRequestException('Order item does not have enough batch stock');
      }

      await tx.orderItemBatchAllocation.createMany({
        data: allocations.map((allocation) => ({
          orderItemId: item.id,
          batchId: allocation.batchId,
          quantity: allocation.quantity,
        })),
      });
    }
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
