import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

const affiliateProgramArgs = Prisma.validator<Prisma.AffiliateProgramDefaultArgs>()({
  include: {
    ownerShop: { select: { shopName: true } },
    brand: { select: { name: true } },
    productModel: { select: { modelName: true } },
    offer: { select: { title: true } },
  },
});

const affiliateAccountArgs = Prisma.validator<Prisma.AffiliateAccountDefaultArgs>()({
  include: {
    program: { select: { name: true } },
  },
});

const affiliateCodeArgs = Prisma.validator<Prisma.AffiliateCodeDefaultArgs>()({
  include: {
    program: { select: { name: true } },
    account: { select: { id: true } },
  },
});

const affiliateConversionArgs = Prisma.validator<Prisma.AffiliateConversionDefaultArgs>()({
  include: {
    commissionEntries: true,
  },
});

const affiliatePayoutArgs = Prisma.validator<Prisma.AffiliatePayoutDefaultArgs>()({});

export type AffiliateProgramWithRelations = Prisma.AffiliateProgramGetPayload<typeof affiliateProgramArgs>;
export type AffiliateAccountWithRelations = Prisma.AffiliateAccountGetPayload<typeof affiliateAccountArgs>;
export type AffiliateCodeWithRelations = Prisma.AffiliateCodeGetPayload<typeof affiliateCodeArgs>;
export type AffiliateConversionWithRelations = Prisma.AffiliateConversionGetPayload<typeof affiliateConversionArgs>;
export type AffiliatePayoutWithRelations = Prisma.AffiliatePayoutGetPayload<typeof affiliatePayoutArgs>;

@Injectable()
export class AffiliateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedShop(shopId: string, ownerUserId: string) {
    return this.prisma.shop.findFirst({
      where: { id: shopId, ownerUserId },
      select: { id: true },
    });
  }

  findBrandById(id: string) {
    return this.prisma.brand.findUnique({ where: { id }, select: { id: true } });
  }

  findProductModelById(id: string) {
    return this.prisma.productModel.findUnique({ where: { id }, select: { id: true } });
  }

  findOwnedOffer(offerId: string, sellerUserId: string) {
    return this.prisma.offer.findFirst({
      where: {
        id: offerId,
        shop: {
          ownerUserId: sellerUserId,
        },
      },
      select: {
        id: true,
        shopId: true,
      },
    });
  }

  findProgramBySlug(slug: string) {
    return this.prisma.affiliateProgram.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  async createProgram(data: {
    ownerShopId: string;
    brandId: string | null;
    productModelId: string | null;
    offerId: string | null;
    scopeType: 'SHOP' | 'BRAND' | 'PRODUCT_MODEL' | 'OFFER';
    name: string;
    slug: string;
    attributionWindowDays: number;
    commissionModel: string;
    tier1Rate: number;
    tier2Rate: number;
    rulesJson: Record<string, unknown> | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }): Promise<AffiliateProgramWithRelations> {
    const program = await this.prisma.affiliateProgram.create({
      data: {
        ownerShopId: data.ownerShopId,
        brandId: data.brandId,
        productModelId: data.productModelId,
        offerId: data.offerId,
        scopeType: data.scopeType,
        name: data.name,
        slug: data.slug,
        programStatus: 'ACTIVE',
        attributionWindowDays: data.attributionWindowDays,
        commissionModel: data.commissionModel,
        tier1Rate: data.tier1Rate,
        tier2Rate: data.tier2Rate,
        rulesJson: data.rulesJson ? (data.rulesJson as Prisma.InputJsonValue) : Prisma.JsonNull,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
      },
      ...affiliateProgramArgs,
    });

    return program;
  }

  findProgramsByOwnerUserId(requesterUserId: string) {
    return this.prisma.affiliateProgram.findMany({
      where: {
        ownerShop: {
          ownerUserId: requesterUserId,
        },
      },
      orderBy: { createdAt: 'desc' },
      ...affiliateProgramArgs,
    });
  }

  findProgramForJoin(programId: string) {
    return this.prisma.affiliateProgram.findUnique({
      where: { id: programId },
      select: {
        id: true,
        programStatus: true,
      },
    });
  }

  findAffiliateAccountByProgramAndUser(programId: string, userId: string) {
    return this.prisma.affiliateAccount.findUnique({
      where: {
        programId_userId: {
          programId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });
  }

  findAffiliateCodeByCode(code: string) {
    return this.prisma.affiliateCode.findUnique({
      where: { code },
      select: {
        id: true,
        programId: true,
        accountId: true,
        expiresAt: true,
        account: {
          select: {
            accountStatus: true,
            referralPath: true,
          },
        },
      },
    });
  }

  createAffiliateAccount(data: {
    programId: string;
    userId: string;
    parentAccountId: string | null;
    referralPath: string | null;
  }) {
    return this.prisma.affiliateAccount.create({
      data: {
        programId: data.programId,
        userId: data.userId,
        parentAccountId: data.parentAccountId,
        referralPath: data.referralPath,
        accountStatus: 'ACTIVE',
        approvedAt: new Date(),
      },
      ...affiliateAccountArgs,
    });
  }

  findAffiliateAccountsByUser(userId: string) {
    return this.prisma.affiliateAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...affiliateAccountArgs,
    });
  }

  findOwnedAffiliateAccount(accountId: string, userId: string) {
    return this.prisma.affiliateAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
      ...affiliateAccountArgs,
    });
  }

  findCommissionEntriesByAccount(accountId: string) {
    return this.prisma.affiliateCommissionLedger.findMany({
      where: {
        beneficiaryAccountId: accountId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAffiliateAccountSummary(accountId: string) {
    const [account, conversions, commissionEntries] = await this.prisma.$transaction([
      this.prisma.affiliateAccount.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          programId: true,
          program: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.affiliateConversion.findMany({
        where: {
          OR: [{ tier1AccountId: accountId }, { tier2AccountId: accountId }],
        },
        select: {
          id: true,
          tier1AccountId: true,
          tier2AccountId: true,
        },
      }),
      this.prisma.affiliateCommissionLedger.findMany({
        where: {
          beneficiaryAccountId: accountId,
        },
        select: {
          amount: true,
          commissionStatus: true,
        },
      }),
    ]);

    return {
      account,
      conversions,
      commissionEntries,
    };
  }

  createAffiliateCode(data: {
    programId: string;
    accountId: string;
    code: string;
    landingUrl: string | null;
    isDefault: boolean;
    expiresAt: Date | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.affiliateCode.updateMany({
          where: {
            accountId: data.accountId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.affiliateCode.create({
        data: {
          programId: data.programId,
          accountId: data.accountId,
          code: data.code,
          landingUrl: data.landingUrl,
          isDefault: data.isDefault,
          expiresAt: data.expiresAt,
        },
        ...affiliateCodeArgs,
      });
    });
  }

  findAffiliateCodesByAccount(accountId: string) {
    return this.prisma.affiliateCode.findMany({
      where: { accountId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      ...affiliateCodeArgs,
    });
  }

  findOwnedProgramById(programId: string, requesterUserId: string) {
    return this.prisma.affiliateProgram.findFirst({
      where: {
        id: programId,
        ownerShop: {
          ownerUserId: requesterUserId,
        },
      },
      select: {
        id: true,
      },
    });
  }

  findConversionsByProgram(programId: string): Promise<AffiliateConversionWithRelations[]> {
    return this.prisma.affiliateConversion.findMany({
      where: { programId },
      orderBy: { recordedAt: 'desc' },
      ...affiliateConversionArgs,
    });
  }

  findConversionsByAccount(accountId: string): Promise<AffiliateConversionWithRelations[]> {
    return this.prisma.affiliateConversion.findMany({
      where: {
        OR: [{ tier1AccountId: accountId }, { tier2AccountId: accountId }],
      },
      orderBy: { recordedAt: 'desc' },
      ...affiliateConversionArgs,
    });
  }

  findOwnedConversionById(conversionId: string, requesterUserId: string) {
    return this.prisma.affiliateConversion.findFirst({
      where: {
        id: conversionId,
        program: {
          ownerShop: {
            ownerUserId: requesterUserId,
          },
        },
      },
      select: {
        id: true,
        programId: true,
        conversionStatus: true,
      },
    });
  }

  async approveConversion(conversionId: string): Promise<AffiliateConversionWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.affiliateCommissionLedger.updateMany({
        where: {
          conversionId,
          commissionStatus: 'PENDING',
        },
        data: {
          commissionStatus: 'APPROVED',
        },
      });

      return tx.affiliateConversion.update({
        where: { id: conversionId },
        data: {
          conversionStatus: 'APPROVED',
          approvedAt: new Date(),
        },
        ...affiliateConversionArgs,
      });
    });
  }

  async rejectConversion(conversionId: string): Promise<AffiliateConversionWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.affiliateCommissionLedger.updateMany({
        where: {
          conversionId,
          commissionStatus: 'PENDING',
        },
        data: {
          commissionStatus: 'CANCELLED',
        },
      });

      return tx.affiliateConversion.update({
        where: { id: conversionId },
        data: {
          conversionStatus: 'REJECTED',
        },
        ...affiliateConversionArgs,
      });
    });
  }

  findOwnedAccountInProgram(accountId: string, programId: string, requesterUserId: string) {
    return this.prisma.affiliateAccount.findFirst({
      where: {
        id: accountId,
        programId,
        program: {
          ownerShop: {
            ownerUserId: requesterUserId,
          },
        },
      },
      select: {
        id: true,
        programId: true,
      },
    });
  }

  findApprovedLedgerEntriesForPayout(input: {
    programId: string;
    accountId: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    return this.prisma.affiliateCommissionLedger.findMany({
      where: {
        beneficiaryAccountId: input.accountId,
        payoutId: null,
        commissionStatus: 'APPROVED',
        conversion: {
          programId: input.programId,
          approvedAt: {
            gte: input.periodStart,
            lte: input.periodEnd,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createPayout(data: {
    programId: string;
    accountId: string;
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;
    externalRef: string | null;
    ledgerEntryIds: string[];
  }): Promise<AffiliatePayoutWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.affiliatePayout.create({
        data: {
          programId: data.programId,
          accountId: data.accountId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          totalAmount: data.totalAmount,
          payoutStatus: 'PENDING',
          externalRef: data.externalRef,
        },
        ...affiliatePayoutArgs,
      });

      await tx.affiliateCommissionLedger.updateMany({
        where: {
          id: {
            in: data.ledgerEntryIds,
          },
        },
        data: {
          commissionStatus: 'LOCKED',
          lockedAt: new Date(),
          payoutId: payout.id,
        },
      });

      return payout;
    });
  }

  findPayoutsByProgram(programId: string): Promise<AffiliatePayoutWithRelations[]> {
    return this.prisma.affiliatePayout.findMany({
      where: { programId },
      orderBy: { createdAt: 'desc' },
      ...affiliatePayoutArgs,
    });
  }

  findPayoutsByAccount(accountId: string): Promise<AffiliatePayoutWithRelations[]> {
    return this.prisma.affiliatePayout.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      ...affiliatePayoutArgs,
    });
  }

  findOwnedPayoutById(payoutId: string, requesterUserId: string) {
    return this.prisma.affiliatePayout.findFirst({
      where: {
        id: payoutId,
        program: {
          ownerShop: {
            ownerUserId: requesterUserId,
          },
        },
      },
      select: {
        id: true,
        payoutStatus: true,
      },
    });
  }

  async updatePayoutStatus(input: {
    payoutId: string;
    payoutStatus: 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  }): Promise<AffiliatePayoutWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.AffiliatePayoutUpdateInput = {
        payoutStatus: input.payoutStatus,
      };

      if (input.payoutStatus === 'PAID') {
        updateData.paidAt = new Date();
      }

      const payout = await tx.affiliatePayout.update({
        where: { id: input.payoutId },
        data: updateData,
        ...affiliatePayoutArgs,
      });

      if (input.payoutStatus === 'PAID') {
        await tx.affiliateCommissionLedger.updateMany({
          where: { payoutId: input.payoutId },
          data: {
            commissionStatus: 'PAID',
            paidAt: new Date(),
          },
        });
      }

      if (input.payoutStatus === 'FAILED' || input.payoutStatus === 'CANCELLED') {
        await tx.affiliateCommissionLedger.updateMany({
          where: { payoutId: input.payoutId },
          data: {
            commissionStatus: 'APPROVED',
            payoutId: null,
            lockedAt: null,
          },
        });
      }

      return payout;
    });
  }
}
