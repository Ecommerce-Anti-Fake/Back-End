import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { calculateAffiliateCommissionAmounts } from './affiliate-commission.util';

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
    items: true,
  },
});

export type OfferForOrdering = Prisma.OfferGetPayload<typeof offerForOrderingArgs>;
export type OrderWithRelations = Prisma.OrderGetPayload<typeof orderWithRelationsArgs>;

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOfferForOrdering(offerId: string): Promise<OfferForOrdering | null> {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      ...offerForOrderingArgs,
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

  createOrder(data: {
    buyerUserId: string | null;
    buyerShopId: string | null;
    buyerDistributionNodeId: string | null;
    shopId: string;
    orderMode: 'RETAIL' | 'WHOLESALE';
    orderType: string;
    orderStatus: string;
    baseAmount: number;
    discountAmount: number;
    platformFeeAmount: number;
    buyerPayableAmount: number;
    sellerReceivableAmount: number;
    totalAmount: number;
    item: {
      offerId: string;
      offerTitleSnapshot: string;
      unitPrice: number;
      quantity: number;
      verificationLevelSnapshot: string;
    };
    affiliateAttribution?: {
      affiliateCode: string;
      customerUserId: string;
      offerId: string;
      sellerShopId: string;
      brandId: string;
      productModelId: string;
      orderAmount: number;
      commissionBase: number;
    };
  }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const stockUpdateResult = await tx.offer.updateMany({
        where: {
          id: data.item.offerId,
          availableQuantity: {
            gte: data.item.quantity,
          },
        },
        data: {
          availableQuantity: {
            decrement: data.item.quantity,
          },
        },
      });

      if (stockUpdateResult.count === 0) {
        throw new BadRequestException('Quantity exceeds available stock');
      }

      const order = await tx.order.create({
        data: {
          buyerUserId: data.buyerUserId,
          buyerShopId: data.buyerShopId,
          buyerDistributionNodeId: data.buyerDistributionNodeId,
          shopId: data.shopId,
          orderMode: data.orderMode,
          orderType: data.orderType,
          orderStatus: data.orderStatus,
          baseAmount: data.baseAmount,
          discountAmount: data.discountAmount,
          platformFeeAmount: data.platformFeeAmount,
          buyerPayableAmount: data.buyerPayableAmount,
          sellerReceivableAmount: data.sellerReceivableAmount,
          totalAmount: data.totalAmount,
          items: {
            create: data.item,
          },
          paymentIntent: {
            create: {
              paymentMethod: 'manual_confirmation',
              paymentStatus: 'PENDING',
              amount: data.buyerPayableAmount,
            },
          },
        },
        ...orderWithRelationsArgs,
      });

      if (data.affiliateAttribution) {
        await this.tryCreateAffiliateAttribution(tx, order.id, data.affiliateAttribution);
      }

      return order;
    });
  }

  findOrderById(id: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({
      where: { id },
      ...orderWithRelationsArgs,
    });
  }

  async markOrderPaid(input: { id: string; providerRef: string | null }): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { orderId: input.id },
        data: {
          paymentStatus: 'PAID',
          providerRef: input.providerRef,
        },
      });

      return tx.order.update({
        where: { id: input.id },
        data: {
          orderStatus: 'paid',
        },
        ...orderWithRelationsArgs,
      });
    });
  }

  async completeOrder(id: string): Promise<OrderWithRelations> {
    return this.prisma.order.update({
      where: { id },
      data: {
        orderStatus: 'completed',
      },
      ...orderWithRelationsArgs,
    });
  }

  async cancelOrder(id: string): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      for (const item of order.items) {
        await tx.offer.update({
          where: { id: item.offerId },
          data: {
            availableQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      await tx.paymentIntent.update({
        where: { orderId: id },
        data: {
          paymentStatus: 'CANCELLED',
        },
      });

      await tx.affiliateCommissionLedger.updateMany({
        where: {
          conversion: {
            orderId: id,
          },
          commissionStatus: 'PENDING',
        },
        data: {
          commissionStatus: 'CANCELLED',
        },
      });

      await tx.affiliateConversion.updateMany({
        where: {
          orderId: id,
          conversionStatus: 'PENDING',
        },
        data: {
          conversionStatus: 'CANCELLED',
        },
      });

      return tx.order.update({
        where: { id },
        data: {
          orderStatus: 'cancelled',
        },
        ...orderWithRelationsArgs,
      });
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
}
