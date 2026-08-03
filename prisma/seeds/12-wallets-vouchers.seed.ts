import {
  PayoutAccountOwnerType,
  PayoutAccountVerificationMethod,
  PayoutAccountVerificationStatus,
  PrismaClient,
  WalletBalanceType,
  WalletEntryDirection,
  WalletTransactionStatus,
  WalletTransactionType,
  WalletTopUpStatus,
  WithdrawalStatus,
} from '@prisma/client';
import { COUNTS, id, money, pick, recentDate, SeedContext, sha256 } from './00-utils';

export async function seedWalletsAndVouchers(prisma: PrismaClient, ctx: SeedContext) {
  const platformWallet = await prisma.wallet.create({
    data: {
      id: id(),
      walletCode: 'WALLET-PLATFORM-VND',
      platformCode: 'PLATFORM-VND',
      ownerType: 'PLATFORM',
      availableBalance: money(500000000),
    },
  });

  const userWallets = new Map<string, { id: string; availableBalance: number }>();
  for (const [index, user] of ctx.users.entries()) {
    const availableBalance = 1500000 + index * 250000;
    const wallet = await prisma.wallet.create({
      data: {
        id: id(),
        walletCode: `WALLET-USER-${String(index + 1).padStart(3, '0')}`,
        ownerType: 'USER',
        userId: user.id,
        availableBalance: money(availableBalance),
      },
    });
    userWallets.set(user.id, { id: wallet.id, availableBalance });
  }

  const shopWallets = new Map<string, string>();
  for (const [index, shop] of ctx.shops.entries()) {
    const wallet = await prisma.wallet.create({
      data: {
        id: id(),
        walletCode: `WALLET-SHOP-${String(index + 1).padStart(3, '0')}`,
        ownerType: 'SHOP',
        shopId: shop.id,
        availableBalance: money(40000000 + index * 1500000),
      },
    });
    shopWallets.set(shop.id, wallet.id);
  }

  await seedInitialWalletLedgers(prisma, [
    { id: platformWallet.id, availableBalance: 500000000 },
    ...Array.from(userWallets.values()),
    ...Array.from(shopWallets.values()).map((walletId) => ({ id: walletId, availableBalance: 40000000 })),
  ]);

  const payoutAccounts: { id: string; shopId: string }[] = [];
  for (let i = 0; i < COUNTS.payoutAccounts; i += 1) {
    const shop = pick(ctx.shops, i);
    const accountNumber = `1900${String(100000 + i).padStart(6, '0')}`;
    const payoutAccount = await prisma.payoutAccount.create({
      data: {
        id: id(),
        ownerType: PayoutAccountOwnerType.SHOP,
        shopId: shop.id,
        bankBin: '970415',
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        accountNumberEncrypted: `seed-encrypted-${accountNumber}`,
        accountNumberHash: sha256(accountNumber),
        accountNumberLast4: accountNumber.slice(-4),
        accountNumberLength: accountNumber.length,
        declaredAccountHolder: shop.shopName,
        resolvedAccountHolder: i % 5 === 0 ? null : shop.shopName.toUpperCase(),
        verificationStatus: i % 5 === 0 ? PayoutAccountVerificationStatus.PENDING : PayoutAccountVerificationStatus.VERIFIED,
        verificationMethod: i % 5 === 0 ? null : PayoutAccountVerificationMethod.MANUAL_BANK_APP,
        verifiedByUserId: i % 5 === 0 ? null : ctx.admins[0]?.id,
        verifiedAt: i % 5 === 0 ? null : recentDate(10),
        availableAfter: recentDate(0),
      },
    });
    payoutAccounts.push({ id: payoutAccount.id, shopId: shop.id });
  }

  const userPayoutAccounts: { id: string; userId: string }[] = [];
  for (let i = 0; i < Math.min(4, ctx.users.length); i += 1) {
    const user = ctx.users[i];
    const accountNumber = `1900${String(500000 + i).padStart(6, '0')}`;
    const payoutAccount = await prisma.payoutAccount.create({
      data: {
        id: id(),
        ownerType: PayoutAccountOwnerType.USER,
        userId: user.id,
        bankBin: '970415',
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        accountNumberEncrypted: `seed-encrypted-${accountNumber}`,
        accountNumberHash: sha256(accountNumber),
        accountNumberLast4: accountNumber.slice(-4),
        accountNumberLength: accountNumber.length,
        declaredAccountHolder: user.displayName,
        resolvedAccountHolder: user.displayName.toUpperCase(),
        verificationStatus: PayoutAccountVerificationStatus.VERIFIED,
        verificationMethod: PayoutAccountVerificationMethod.MANUAL_BANK_APP,
        verifiedByUserId: ctx.admins[0]?.id,
        verifiedAt: recentDate(8),
        availableAfter: recentDate(0),
      },
    });
    userPayoutAccounts.push({ id: payoutAccount.id, userId: user.id });
  }

  for (let i = 0; i < Math.min(5, ctx.shops.length); i += 1) {
    const shop = ctx.shops[i];
    const accountNumber = `1900${String(300000 + i).padStart(6, '0')}`;
    await prisma.bankAccountVerification.create({
      data: {
        id: id(),
        userId: shop.ownerUserId,
        shopId: shop.id,
        bankBin: '970415',
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        bankShortName: 'VCB',
        accountNumberEncrypted: `seed-encrypted-${accountNumber}`,
        accountNumberHash: sha256(accountNumber),
        accountNumberLast4: accountNumber.slice(-4),
        accountNumberLength: accountNumber.length,
        accountHolder: shop.shopName.toUpperCase(),
        provider: 'SEED_PROVIDER',
        expiresAt: recentDate(-1),
        consumedAt: i % 2 === 0 ? recentDate(1) : null,
      },
    });
  }

  for (let i = 0; i < COUNTS.walletTopUps; i += 1) {
    const user = pick(ctx.users, i);
    const wallet = userWallets.get(user.id);
    if (!wallet) continue;
    await prisma.walletTopUp.create({
      data: {
        id: id(),
        walletId: wallet.id,
        idempotencyKey: `SEED-TOPUP-${i + 1}`,
        orderCode: `SEEDTOPUP${String(i + 1).padStart(6, '0')}`,
        paymentLinkId: `seed-payment-link-${i + 1}`,
        amount: money(500000 + i * 100000),
        checkoutUrl: `https://payos.example/seed/${i + 1}`,
        status: i % 5 === 0 ? WalletTopUpStatus.PENDING : WalletTopUpStatus.PAID,
        paidAt: i % 5 === 0 ? null : recentDate(i % 10),
      },
    });
  }

  for (let i = 0; i < Math.min(COUNTS.walletTransactions, ctx.orders.length); i += 1) {
    const order = ctx.orders[i];
    const userWallet = userWallets.get(order.buyerUserId ?? '');
    const paymentIntent = await prisma.paymentIntent.findUnique({ where: { orderId: order.id } });
    if (!userWallet || !paymentIntent) continue;
    const amount = Number(order.totalAmount);
    const transaction = await prisma.walletTransaction.create({
      data: {
        id: id(),
        transactionCode: `WALLET-TX-${String(i + 1).padStart(6, '0')}`,
        transactionType: i % 3 === 0 ? WalletTransactionType.PAYMENT : WalletTransactionType.ESCROW_HOLD,
        status: order.orderStatus === 'pending' ? WalletTransactionStatus.PENDING : WalletTransactionStatus.COMPLETED,
        amount: money(amount),
        idempotencyKey: `SEED-WALLET-TX-${i + 1}`,
        referenceType: 'ORDER',
        referenceId: order.id,
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        description: 'Seed wallet transaction for UAT flow.',
        completedAt: order.orderStatus === 'pending' ? null : recentDate(i % 10),
      },
    });
    await prisma.walletLedgerEntry.create({
      data: {
        id: id(),
        walletId: userWallet.id,
        transactionId: transaction.id,
        direction: WalletEntryDirection.DEBIT,
        balanceType: WalletBalanceType.AVAILABLE,
        amount: money(Math.min(amount, userWallet.availableBalance)),
        balanceBefore: money(userWallet.availableBalance),
        balanceAfter: money(Math.max(0, userWallet.availableBalance - Math.min(amount, userWallet.availableBalance))),
      },
    });
  }

  for (let i = 0; i < COUNTS.walletWithdrawals; i += 1) {
    const payout = payoutAccounts[i % payoutAccounts.length];
    const walletId = shopWallets.get(payout.shopId);
    const shop = ctx.shops.find((item) => item.id === payout.shopId);
    if (!walletId || !shop) continue;
    const status = [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.COMPLETED, WithdrawalStatus.REJECTED][i % 4];
    await prisma.walletWithdrawal.create({
      data: {
        id: id(),
        walletId,
        payoutAccountId: payout.id,
        requestedByUserId: shop.ownerUserId,
        processedByUserId: status === WithdrawalStatus.PENDING ? null : ctx.admins[0]?.id,
        idempotencyKey: `SEED-WITHDRAWAL-${i + 1}`,
        amount: money(100000 + i * 50000),
        bankBin: '970415',
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        accountNumberEncryptedSnapshot: `seed-encrypted-withdrawal-${i + 1}`,
        accountNumberLast4: '0001',
        accountNumberLength: 10,
        accountHolder: shop.shopName.toUpperCase(),
        status,
        transferReference: status === WithdrawalStatus.COMPLETED ? `SEED-BANK-${i + 1}` : null,
        rejectionReason: status === WithdrawalStatus.REJECTED ? 'Seed rejected withdrawal for admin UAT.' : null,
        approvedAt: status === WithdrawalStatus.PENDING || status === WithdrawalStatus.REJECTED ? null : recentDate(4),
        completedAt: status === WithdrawalStatus.COMPLETED ? recentDate(2) : null,
        processedAt: status === WithdrawalStatus.PENDING ? null : recentDate(2),
      },
    });
  }

  for (let i = 0; i < COUNTS.withdrawalAuthorizations; i += 1) {
    const user = pick(ctx.users, i);
    const wallet = userWallets.get(user.id);
    const payout = userPayoutAccounts.find((item) => item.userId === user.id);
    if (!wallet) continue;
    await prisma.withdrawalAuthorization.create({
      data: {
        id: id(),
        userId: user.id,
        walletId: wallet.id,
        payoutAccountId: payout?.id ?? null,
        operation: 'CREATE_WITHDRAWAL',
        channel: i % 2 === 0 ? 'PHONE' : 'EMAIL',
        operationDigest: sha256(`seed-withdrawal-operation-${i}`),
        authorizationTokenHash: sha256(`seed-authorization-token-${i}`),
        verifiedAt: i % 2 === 0 ? recentDate(1) : null,
        expiresAt: recentDate(-1),
        consumedAt: i % 2 === 0 ? recentDate(1) : null,
      },
    });
  }

  const vouchers: { id: string; shopId: string | null; ownerType: 'SYSTEM' | 'SHOP' }[] = [];
  for (let i = 0; i < COUNTS.vouchers; i += 1) {
    const isSystem = i < 3;
    const shop = isSystem ? null : pick(ctx.shops, i);
    const voucher = await prisma.voucher.create({
      data: {
        id: id(),
        ownerType: isSystem ? 'SYSTEM' : 'SHOP',
        fundingSource: isSystem ? 'PLATFORM' : 'SHOP',
        shopId: shop?.id ?? null,
        code: `UAT${isSystem ? 'SYS' : 'SHOP'}${String(i + 1).padStart(4, '0')}`,
        name: isSystem ? 'UAT Platform Voucher' : `UAT ${shop?.shopName} Voucher`,
        discountType: i % 3 === 0 ? 'PERCENTAGE' : i % 3 === 1 ? 'FIXED_AMOUNT' : 'FREE_SHIPPING',
        percentage: i % 3 === 0 ? money(10 + (i % 4) * 5) : null,
        fixedAmount: i % 3 === 1 ? money(30000 + i * 5000) : null,
        maxDiscountAmount: i % 3 === 0 ? money(100000) : null,
        minOrderAmount: money(150000),
        scopeType: 'ALL',
        totalUsageLimit: 1000,
        userUsageLimit: 3,
        startsAt: recentDate(10),
        endsAt: recentDate(-30),
        status: 'ACTIVE',
      },
    });
    vouchers.push({ id: voucher.id, shopId: shop?.id ?? null, ownerType: isSystem ? 'SYSTEM' : 'SHOP' });
  }

  const systemVoucher = vouchers.find((voucher) => voucher.ownerType === 'SYSTEM');
  if (systemVoucher) {
    for (let i = 0; i < Math.min(COUNTS.voucherRedemptions, ctx.orders.length); i += 1) {
      const order = ctx.orders[i];
      await prisma.voucherRedemption.create({
        data: {
          id: id(),
          voucherId: systemVoucher.id,
          userId: order.buyerUserId!,
          orderId: order.id,
          status: i % 5 === 0 ? 'RESERVED' : i % 7 === 0 ? 'RELEASED' : 'USED',
          idempotencyKey: `SEED-REDEMPTION-${i + 1}`,
          redeemedAt: recentDate(i % 10),
          releasedAt: i % 7 === 0 ? recentDate(1) : null,
        },
      });
      const group = ctx.orderGroups.find((item) => item.orderId === order.id);
      if (group && i < COUNTS.orderVoucherAllocations) {
        await prisma.orderVoucherAllocation.create({
          data: {
            id: id(),
            orderId: order.id,
            orderShopGroupId: group.id,
            voucherId: systemVoucher.id,
            productDiscountAmount: money(20000 + i * 1000),
            shippingDiscountAmount: money(i % 3 === 0 ? 18000 : 0),
            eligibleBaseAmount: group.baseAmount,
            fundingSource: 'SYSTEM',
          },
        });
      }
    }
  }

  const sessions = await prisma.liveCommerceSession.findMany({ select: { id: true } });
  for (let i = 0; i < Math.min(sessions.length, 3); i += 1) {
    const voucher = vouchers[i % vouchers.length];
    await prisma.liveSessionVoucher.create({ data: { id: id(), sessionId: sessions[i].id, voucherId: voucher.id, sortOrder: i } });
  }

  for (let i = 0; i < Math.min(COUNTS.codSettlements, ctx.orderGroups.length); i += 1) {
    const group = ctx.orderGroups[i];
    const shopWalletId = shopWallets.get(group.shopId);
    if (!shopWalletId) continue;
    const order = ctx.orders.find((item) => item.id === group.orderId);
    if (!order) continue;
    await prisma.codShopSettlement.create({
      data: {
        id: id(),
        orderId: group.orderId,
        orderShopGroupId: group.id,
        shopId: group.shopId,
        walletId: shopWalletId,
        platformFeeAmount: group.platformFeeAmount,
        affiliateAmount: money(i % 4 === 0 ? 5000 : 0),
        obligationAmount: money(Number(group.sellerReceivableAmount)),
        settledAmount: order.orderStatus === 'completed' ? group.sellerReceivableAmount : money(0),
        status: order.orderStatus === 'completed' ? 'SETTLED' : order.orderStatus === 'cancelled' ? 'REVERSED' : 'OUTSTANDING',
        dueAt: recentDate(-3),
        settledAt: order.orderStatus === 'completed' ? recentDate(2) : null,
        reversedAt: order.orderStatus === 'cancelled' ? recentDate(1) : null,
      },
    });
  }
}

async function seedInitialWalletLedgers(prisma: PrismaClient, wallets: Array<{ id: string; availableBalance?: number }>) {
  for (let i = 0; i < wallets.length; i += 1) {
    const amount = wallets[i].availableBalance ?? 0;
    const transaction = await prisma.walletTransaction.create({
      data: {
        id: id(),
        transactionCode: `WALLET-INIT-${String(i + 1).padStart(4, '0')}`,
        transactionType: WalletTransactionType.ADJUSTMENT,
        status: WalletTransactionStatus.COMPLETED,
        amount: money(amount),
        idempotencyKey: `SEED-WALLET-INIT-${i + 1}`,
        referenceType: 'SEED',
        referenceId: wallets[i].id,
        description: 'Initial UAT wallet balance.',
        completedAt: recentDate(30),
      },
    });
    await prisma.walletLedgerEntry.create({
      data: {
        id: id(),
        walletId: wallets[i].id,
        transactionId: transaction.id,
        direction: WalletEntryDirection.CREDIT,
        balanceType: WalletBalanceType.AVAILABLE,
        amount: money(amount),
        balanceBefore: money(0),
        balanceAfter: money(amount),
      },
    });
  }
}
