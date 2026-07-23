import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '@wallet/infrastructure/persistence/wallet.repository';

const affiliateProgramArgs = Prisma.validator<Prisma.AffiliateProgramDefaultArgs>()({
  include: {
    ownerShop: { select: { shopName: true } },
    brand: { select: { name: true } },
    offer: { select: { title: true, modelName: true } },
  },
});

const sellerAffiliateProgramArgs = Prisma.validator<Prisma.AffiliateProgramDefaultArgs>()({
  include: {
    ownerShop: { select: { shopName: true } },
    brand: { select: { name: true } },
    offer: { select: { title: true, modelName: true } },
    _count: { select: { accounts: true, conversions: true } },
  },
});

const affiliateAccountArgs = Prisma.validator<Prisma.AffiliateAccountDefaultArgs>()({
  include: {
    program: {
      select: {
        name: true,
        ownerShopId: true,
        ownerShop: { select: { shopName: true } },
        scopeType: true,
        offerId: true,
        offer: { select: { title: true } },
        programStatus: true,
        tier1Rate: true,
        tier2Rate: true,
        commissionHoldDays: true,
        endedAt: true,
      },
    },
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
export type SellerAffiliateProgramWithRelations = Prisma.AffiliateProgramGetPayload<
  typeof sellerAffiliateProgramArgs
>;
export type AffiliateAccountWithRelations = Prisma.AffiliateAccountGetPayload<typeof affiliateAccountArgs>;
export type AffiliateCodeWithRelations = Prisma.AffiliateCodeGetPayload<typeof affiliateCodeArgs>;
export type AffiliateConversionWithRelations = Prisma.AffiliateConversionGetPayload<typeof affiliateConversionArgs>;
export type AffiliatePayoutWithRelations = Prisma.AffiliatePayoutGetPayload<typeof affiliatePayoutArgs>;

@Injectable()
export class AffiliateRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
  ) {}

  findOwnedShop(shopId: string, ownerUserId: string) {
    return this.prisma.shop.findFirst({
      where: { id: shopId, ownerUserId },
      select: { id: true, shopStatus: true },
    });
  }

  findBrandById(id: string) {
    return this.prisma.brand.findUnique({ where: { id }, select: { id: true } });
  }

  findApprovedBrandForShop(shopId: string, brandId: string) {
    return this.prisma.brandAuthorization.findFirst({
      where: { shopId, brandId, verificationStatus: 'approved' },
      select: { id: true },
    });
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
    offerId: string | null;
    scopeType: 'SHOP' | 'BRAND' | 'OFFER';
    name: string;
    slug: string;
    attributionWindowDays: number;
    commissionHoldDays: number;
    commissionModel: string;
    settlementMode: 'MANUAL' | 'AUTOMATIC';
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
        offerId: data.offerId,
        scopeType: data.scopeType,
        name: data.name,
        slug: data.slug,
        programStatus: 'ACTIVE',
        attributionWindowDays: data.attributionWindowDays,
        commissionHoldDays: data.commissionHoldDays,
        commissionModel: data.commissionModel,
        settlementMode: data.settlementMode,
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
        ownerShop: {
          select: {
            ownerUserId: true,
          },
        },
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
            id: true,
            accountStatus: true,
            referralPath: true,
          },
        },
      },
    });
  }

  findSellerPrograms(input: {
    requesterUserId: string;
    skip: number;
    take: number;
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
    search?: string;
  }): Promise<SellerAffiliateProgramWithRelations[]> {
    return this.prisma.affiliateProgram.findMany({
      where: this.sellerProgramsWhere(input),
      orderBy: { createdAt: 'desc' },
      skip: input.skip,
      take: input.take,
      ...sellerAffiliateProgramArgs,
    });
  }

  countSellerPrograms(input: {
    requesterUserId: string;
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
    search?: string;
  }) {
    return this.prisma.affiliateProgram.count({
      where: this.sellerProgramsWhere(input),
    });
  }

  private sellerProgramsWhere(input: {
    requesterUserId: string;
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
    search?: string;
  }): Prisma.AffiliateProgramWhereInput {
    return {
      ownerShop: { ownerUserId: input.requesterUserId },
      ...(input.status ? { programStatus: input.status } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              {
                ownerShop: {
                  shopName: { contains: input.search, mode: 'insensitive' },
                },
              },
              {
                offer: {
                  title: { contains: input.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  findActivePrograms(now: Date, skip: number, take: number) {
    return this.prisma.affiliateProgram.findMany({
      where: {
        programStatus: 'ACTIVE',
        AND: [
          { OR: [{ startedAt: null }, { startedAt: { lte: now } }] },
          { OR: [{ endedAt: null }, { endedAt: { gt: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      ...affiliateProgramArgs,
    });
  }

  countActivePrograms(now: Date) {
    return this.prisma.affiliateProgram.count({
      where: {
        programStatus: 'ACTIVE',
        AND: [
          { OR: [{ startedAt: null }, { startedAt: { lte: now } }] },
          { OR: [{ endedAt: null }, { endedAt: { gt: now } }] },
        ],
      },
    });
  }

  findAffiliateAttributionByCode(code: string) {
    return this.prisma.affiliateCode.findUnique({
      where: { code },
      select: {
        code: true,
        expiresAt: true,
        account: { select: { accountStatus: true } },
        program: {
          select: {
            id: true,
            programStatus: true,
            attributionWindowDays: true,
            startedAt: true,
            endedAt: true,
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

  findCommissionEntriesByAccount(accountId: string, skip: number, take: number) {
    return this.prisma.affiliateCommissionLedger.findMany({
      where: {
        beneficiaryAccountId: accountId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }

  countCommissionEntriesByAccount(accountId: string) {
    return this.prisma.affiliateCommissionLedger.count({
      where: { beneficiaryAccountId: accountId },
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
        settlementMode: true,
      },
    });
  }

  findOwnedProgramForUpdate(programId: string, requesterUserId: string) {
    return this.prisma.affiliateProgram.findFirst({
      where: {
        id: programId,
        ownerShop: { ownerUserId: requesterUserId },
      },
      select: {
        id: true,
        ownerShopId: true,
        scopeType: true,
        offerId: true,
        name: true,
        programStatus: true,
        attributionWindowDays: true,
        tier1Rate: true,
        tier2Rate: true,
        startedAt: true,
        endedAt: true,
        _count: { select: { accounts: true, conversions: true } },
      },
    });
  }

  updateProgram(
    programId: string,
    data: {
      name?: string;
      scopeType?: 'SHOP' | 'OFFER';
      offerId?: string | null;
      attributionWindowDays?: number;
      tier1Rate?: number;
      tier2Rate?: number;
      startedAt?: Date | null;
      endedAt?: Date | null;
      programStatus?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
    },
  ): Promise<SellerAffiliateProgramWithRelations> {
    return this.prisma.affiliateProgram.update({
      where: { id: programId },
      data,
      ...sellerAffiliateProgramArgs,
    });
  }

  async getSellerAffiliateSummary(
    requesterUserId: string,
    programId: string | null,
  ) {
    const programWhere: Prisma.AffiliateProgramWhereInput = {
      ownerShop: { ownerUserId: requesterUserId },
      ...(programId ? { id: programId } : {}),
    };
    const [
      programCount,
      activeProgramCount,
      memberCount,
      conversionCount,
      commissionTotals,
    ] = await this.prisma.$transaction([
      this.prisma.affiliateProgram.count({ where: programWhere }),
      this.prisma.affiliateProgram.count({
        where: { ...programWhere, programStatus: 'ACTIVE' },
      }),
      this.prisma.affiliateAccount.count({
        where: { program: programWhere },
      }),
      this.prisma.affiliateConversion.count({
        where: { program: programWhere },
      }),
      this.prisma.affiliateCommissionLedger.groupBy({
        by: ['commissionStatus'],
        where: {
          conversion: { program: programWhere },
          beneficiaryType: {
            in: ['AFFILIATE_TIER_1', 'AFFILIATE_TIER_2'],
          },
        },
        orderBy: { commissionStatus: 'asc' },
        _sum: { amount: true },
      }),
    ]);

    return {
      programCount,
      activeProgramCount,
      memberCount,
      conversionCount,
      commissionTotals: commissionTotals.map((item) => ({
        commissionStatus: item.commissionStatus,
        amount: item._sum?.amount ?? new Prisma.Decimal(0),
      })),
    };
  }

  findProgramMembers(programId: string, skip: number, take: number) {
    return this.prisma.affiliateAccount.findMany({
      where: { programId },
      select: {
        id: true,
        parentAccountId: true,
        referralPath: true,
        accountStatus: true,
        joinedAt: true,
        user: { select: { displayName: true } },
        parentAccount: {
          select: { user: { select: { displayName: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip,
      take,
    });
  }

  countProgramMembers(programId: string) {
    return this.prisma.affiliateAccount.count({ where: { programId } });
  }

  findProgramCommissionEntries(input: {
    programId: string;
    skip: number;
    take: number;
    status?: 'PENDING' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED';
    tierLevel?: 1 | 2;
  }) {
    return this.prisma.affiliateCommissionLedger.findMany({
      where: this.programCommissionWhere(input),
      select: {
        id: true,
        conversionId: true,
        beneficiaryAccountId: true,
        tierLevel: true,
        amount: true,
        currency: true,
        commissionStatus: true,
        createdAt: true,
        lockedAt: true,
        availableAt: true,
        paidAt: true,
        payoutId: true,
        beneficiaryAccount: {
          select: { user: { select: { displayName: true } } },
        },
        conversion: {
          select: {
            orderId: true,
            recordedAt: true,
            approvedAt: true,
          },
        },
        payout: {
          select: {
            payoutStatus: true,
            externalRef: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: input.skip,
      take: input.take,
    });
  }

  countProgramCommissionEntries(input: {
    programId: string;
    status?: 'PENDING' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED';
    tierLevel?: 1 | 2;
  }) {
    return this.prisma.affiliateCommissionLedger.count({
      where: this.programCommissionWhere(input),
    });
  }

  private programCommissionWhere(input: {
    programId: string;
    status?: 'PENDING' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED';
    tierLevel?: 1 | 2;
  }): Prisma.AffiliateCommissionLedgerWhereInput {
    return {
      conversion: { programId: input.programId },
      ...(input.status ? { commissionStatus: input.status } : {}),
      ...(input.tierLevel ? { tierLevel: input.tierLevel } : {}),
      beneficiaryType: {
        in: ['AFFILIATE_TIER_1', 'AFFILIATE_TIER_2'],
      },
    };
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
        program: { select: { settlementMode: true } },
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
        amount: { gt: 0 },
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
    totalAmount: Prisma.Decimal.Value;
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

      const claimed = await tx.affiliateCommissionLedger.updateMany({
        where: {
          id: {
            in: data.ledgerEntryIds,
          },
          payoutId: null,
          commissionStatus: 'APPROVED',
        },
        data: {
          commissionStatus: 'LOCKED',
          lockedAt: new Date(),
          payoutId: payout.id,
        },
      });
      if (claimed.count !== data.ledgerEntryIds.length) {
        throw new BadRequestException(
          'Affiliate commission entries changed while creating the payout; retry the request',
        );
      }

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
        program: { select: { settlementMode: true } },
      },
    });
  }

  async updatePayoutStatus(input: {
    payoutId: string;
    actorUserId: string;
    fromStatus: string;
    payoutStatus: 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  }): Promise<AffiliatePayoutWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.AffiliatePayoutUpdateInput = {
        payoutStatus: input.payoutStatus,
      };

      if (input.payoutStatus === 'PAID') {
        updateData.paidAt = new Date();
      }

      const payoutBeforeUpdate = await tx.affiliatePayout.findUnique({
        where: { id: input.payoutId },
        include: {
          account: { select: { userId: true } },
          program: { select: { ownerShopId: true } },
          commissionEntries: { select: { id: true, amount: true, commissionStatus: true, conversionId: true } },
        },
      });
      if (!payoutBeforeUpdate) throw new Error('Affiliate payout not found');

      if (input.payoutStatus === 'PAID') {
        if (!payoutBeforeUpdate.program.ownerShopId) {
          throw new Error('Affiliate payout requires a funding shop');
        }
        const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(
          tx,
          payoutBeforeUpdate.program.ownerShopId,
          payoutBeforeUpdate.currency,
        );
        const affiliateWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(
          tx,
          payoutBeforeUpdate.account.userId,
          payoutBeforeUpdate.currency,
        );

        for (const entry of payoutBeforeUpdate.commissionEntries) {
          if (entry.commissionStatus === 'PAID') continue;
          await this.walletRepository.executeTransactionInTransaction(tx, {
            transactionCode: `AFFILIATE_COMMISSION:${entry.id}`,
            transactionType: WalletTransactionType.AFFILIATE_COMMISSION,
            idempotencyKey: `AFFILIATE_LEDGER:${entry.id}:CREDIT`,
            amount: entry.amount,
            referenceType: 'AFFILIATE_COMMISSION',
            referenceId: entry.id,
            description: `Pay affiliate commission ${entry.id}`,
            entries: [
              { walletId: shopWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount: entry.amount },
              { walletId: affiliateWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: entry.amount },
            ],
          });
        }
      }

      const payout = await tx.affiliatePayout.update({
        where: { id: input.payoutId },
        data: updateData,
        ...affiliatePayoutArgs,
      });

      await tx.auditLog.create({
        data: {
          targetType: 'AFFILIATE_PAYOUT',
          targetId: input.payoutId,
          actorUserId: input.actorUserId,
          action: 'AFFILIATE_PAYOUT_STATUS_CHANGED',
          fromStatus: input.fromStatus,
          toStatus: input.payoutStatus,
          note: `Affiliate payout moved from ${input.fromStatus} to ${input.payoutStatus}`,
          metadata: {
            payoutId: input.payoutId,
          },
        },
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
