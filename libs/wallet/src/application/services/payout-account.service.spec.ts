import { PayoutAccountSecurityService } from '../../domain';
import { PayoutAccountService } from './payout-account.service';

describe('PayoutAccountService', () => {
  const now = new Date('2026-07-27T05:00:00.000Z');
  const verification = {
    id: 'verification-1',
    userId: 'user-1',
    shopId: 'shop-1',
    bankBin: '970436',
    bankCode: 'VCB',
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    bankShortName: 'Vietcombank',
    bankLogo: null,
    accountNumberEncrypted: 'encrypted-account',
    accountNumberHash: 'account-hash',
    accountNumberLast4: '6789',
    accountNumberLength: 10,
    accountHolder: 'TRAN VAN B',
    provider: 'VIETQR',
    expiresAt: new Date('2026-07-27T05:10:00.000Z'),
    consumedAt: null,
    createdAt: now,
  };
  const tx = {
    bankAccountVerification: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    payoutAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    payoutAccount: { findUnique: jest.fn(), findMany: jest.fn() },
    walletWithdrawal: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const walletService = {
    canAccessShopWallet: jest.fn(),
    findOrCreateShopWallet: jest.fn(),
    findOrCreateUserWallet: jest.fn(),
  };
  const authorization = { consumeInTransaction: jest.fn() };
  const security = new PayoutAccountSecurityService({
    get: jest.fn(() => '33'.repeat(32)),
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now.getTime());
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    walletService.canAccessShopWallet.mockResolvedValue(true);
    walletService.findOrCreateShopWallet.mockResolvedValue({ id: 'wallet-1', shopId: 'shop-1' });
    walletService.findOrCreateUserWallet.mockResolvedValue({ id: 'wallet-user-1', userId: 'user-1' });
    tx.bankAccountVerification.findUnique.mockResolvedValue(verification);
    tx.bankAccountVerification.updateMany.mockResolvedValue({ count: 1 });
    tx.payoutAccount.findFirst.mockResolvedValue(null);
    tx.payoutAccount.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'payout-1',
      ...data,
      rejectionReason: null,
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
    }));
  });

  afterEach(() => jest.useRealTimers());

  it('creates a provider-verified account without KYC holder-name matching', async () => {
    const service = new PayoutAccountService(
      prisma as never,
      walletService as never,
      authorization as never,
      security,
    );

    const result = await service.create({
      userId: 'user-1',
      requesterRole: 'user',
      shopId: 'shop-1',
      authorizationToken: 'one-time-token',
      verificationId: 'verification-1',
    });

    expect(authorization.consumeInTransaction).toHaveBeenCalledWith(tx, {
      authorizationToken: 'one-time-token',
      userId: 'user-1',
      walletId: 'wallet-1',
      operation: 'CREATE_PAYOUT_ACCOUNT',
      payload: { bankAccountVerificationId: 'verification-1' },
    });
    expect(tx.payoutAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerType: 'SHOP',
        shopId: 'shop-1',
        accountNumberEncrypted: 'encrypted-account',
        declaredAccountHolder: 'TRAN VAN B',
        resolvedAccountHolder: 'TRAN VAN B',
        verificationStatus: 'VERIFIED',
        verificationMethod: 'PROVIDER',
        verifiedAt: now,
        availableAfter: new Date('2026-07-28T05:00:00.000Z'),
      }),
    });
    expect(tx.bankAccountVerification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'verification-1',
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    expect(result.accountNumberMasked).toBe('******6789');
    expect(result.accountHolder).toBe('TRAN VAN B');
  });

  it('rejects an expired or already-consumed verification session', async () => {
    tx.bankAccountVerification.findUnique.mockResolvedValueOnce({
      ...verification,
      expiresAt: new Date('2026-07-27T04:59:59.000Z'),
    });
    const service = new PayoutAccountService(
      prisma as never,
      walletService as never,
      authorization as never,
      security,
    );

    await expect(service.create({
      userId: 'user-1',
      requesterRole: 'user',
      shopId: 'shop-1',
      authorizationToken: 'token',
      verificationId: 'verification-1',
    })).rejects.toThrow('Bank account verification has expired');
    expect(tx.payoutAccount.create).not.toHaveBeenCalled();
  });

  it('manually verifies a legacy account without comparing it to KYC', async () => {
    prisma.payoutAccount.findUnique.mockResolvedValue({
      id: 'payout-1',
      shopId: 'shop-1',
      userId: null,
      verificationStatus: 'PENDING',
      disabledAt: null,
    });
    tx.payoutAccount.update.mockResolvedValue({
      id: 'payout-1',
      ownerType: 'SHOP',
      shopId: 'shop-1',
      userId: null,
      bankBin: '970436',
      bankCode: 'VCB',
      bankName: 'Vietcombank',
      accountNumberLast4: '6789',
      accountNumberLength: 10,
      declaredAccountHolder: 'OLD NAME',
      resolvedAccountHolder: 'THIRD PARTY NAME',
      verificationStatus: 'VERIFIED',
      verificationMethod: 'MANUAL_BANK_APP',
      availableAfter: now,
      verifiedAt: now,
      rejectionReason: null,
      createdAt: now,
    });
    const service = new PayoutAccountService(
      prisma as never,
      walletService as never,
      authorization as never,
      security,
    );

    await expect(service.verifyManually({
      payoutAccountId: 'payout-1',
      adminUserId: 'admin-1',
      resolvedAccountHolder: 'THIRD PARTY NAME',
    })).resolves.toMatchObject({
      resolvedAccountHolder: 'THIRD PARTY NAME',
      verificationStatus: 'VERIFIED',
    });
  });

  it('returns audited transfer details for the admin QR flow', async () => {
    prisma.walletWithdrawal.findUnique.mockResolvedValue({
      id: 'withdrawal-1234-5678',
      bankBin: '970436',
      bankCode: 'VCB',
      bankName: 'Vietcombank',
      accountNumberEncryptedSnapshot: security.encryptAccountNumber('0123456789'),
      accountNumber: null,
      accountHolder: 'TRAN VAN B',
      amount: { toFixed: () => '150000.00' },
    });
    const service = new PayoutAccountService(
      prisma as never,
      walletService as never,
      authorization as never,
      security,
    );

    await expect(service.revealWithdrawalForAdmin({
      withdrawalId: 'withdrawal-1234-5678',
      adminUserId: 'admin-1',
      reason: 'ADMIN_TRANSFER_QR',
    })).resolves.toMatchObject({
      bankBin: '970436',
      bankCode: 'VCB',
      accountNumber: '0123456789',
      amount: '150000.00',
      transferContent: 'AFWD WITHDRAWAL12',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'PREPARE_WITHDRAWAL_TRANSFER_QR',
      targetId: 'withdrawal-1234-5678',
    }) });
  });
});
