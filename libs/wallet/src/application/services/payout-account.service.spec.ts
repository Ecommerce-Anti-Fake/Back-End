import { PayoutAccountSecurityService } from '../../domain';
import { PayoutAccountService } from './payout-account.service';

describe('PayoutAccountService', () => {
  const now = new Date('2026-07-22T05:00:00.000Z');
  const tx = {
    payoutAccount: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    shop: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    payoutAccount: { findUnique: jest.fn(), findMany: jest.fn() },
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
  const shop = {
    id: 'shop-1', ownerUserId: 'user-1', businessType: 'HOUSEHOLD', verifiedLegalName: null,
    shopStatus: 'verified',
    owner: { kyc: { fullName: 'NGUYỄN VĂN A', verificationStatus: 'approved', verifiedAt: now } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now.getTime());
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    prisma.shop.findUnique.mockResolvedValue(shop);
    walletService.canAccessShopWallet.mockResolvedValue(true);
    walletService.findOrCreateShopWallet.mockResolvedValue({ id: 'wallet-1', shopId: 'shop-1' });
    tx.payoutAccount.findFirst.mockResolvedValue(null);
    tx.payoutAccount.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'payout-1', ...data, resolvedAccountHolder: null, verificationStatus: 'PENDING',
      verificationMethod: null, verifiedAt: null, disabledAt: null, createdAt: now, updatedAt: now,
    }));
    tx.payoutAccount.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'payout-1', ownerType: 'SHOP', shopId: 'shop-1', userId: null,
      bankBin: '970436', bankCode: 'VCB', bankName: 'Vietcombank',
      accountNumberEncrypted: 'encrypted', accountNumberHash: 'hash', accountNumberLast4: '6789',
      accountNumberLength: 10, declaredAccountHolder: 'NGUYEN VAN A', availableAfter: now,
      verificationStatus: 'PENDING', verificationMethod: null, verifiedAt: null,
      rejectionReason: null, disabledAt: null, createdAt: now, updatedAt: now, ...data,
    }));
  });

  afterEach(() => jest.useRealTimers());

  it('creates an encrypted pending account for the approved KYC owner with a 24-hour cooldown', async () => {
    const service = new PayoutAccountService(
      prisma as never, walletService as never, authorization as never, security,
    );

    const result = await service.create({
      userId: 'user-1', requesterRole: 'user', shopId: 'shop-1', authorizationToken: 'one-time-token',
      bankBin: '970436', bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '0123456789',
      accountHolder: 'Nguyen Van A',
    });

    expect(authorization.consumeInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      operation: 'CREATE_PAYOUT_ACCOUNT', walletId: 'wallet-1', userId: 'user-1',
    }));
    const createdData = tx.payoutAccount.create.mock.calls[0][0].data;
    expect(createdData.accountNumberEncrypted).not.toContain('0123456789');
    expect(createdData.availableAfter).toEqual(new Date('2026-07-23T05:00:00.000Z'));
    expect(result.accountNumberMasked).toBe('******6789');
    expect(result).not.toHaveProperty('accountNumberEncrypted');
  });

  it('rejects a declared holder that differs from the KYC owner', async () => {
    const service = new PayoutAccountService(
      prisma as never, walletService as never, authorization as never, security,
    );

    await expect(service.create({
      userId: 'user-1', requesterRole: 'user', shopId: 'shop-1', authorizationToken: 'token',
      bankBin: '970436', bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '0123456789',
      accountHolder: 'TRAN VAN B',
    })).rejects.toThrow('Payout account holder must match the verified owner');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires a verified legal name for a company account', async () => {
    prisma.shop.findUnique.mockResolvedValueOnce({ ...shop, businessType: 'COMPANY', verifiedLegalName: null });
    const service = new PayoutAccountService(
      prisma as never, walletService as never, authorization as never, security,
    );

    await expect(service.create({
      userId: 'user-1', requesterRole: 'user', shopId: 'shop-1', authorizationToken: 'token',
      bankBin: '970436', bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '0123456789',
      accountHolder: 'CONG TY ABC',
    })).rejects.toThrow('Company legal name must be verified before adding a payout account');
  });

  it('manually verifies only the beneficiary name matching the verified owner', async () => {
    prisma.payoutAccount.findUnique.mockResolvedValue({
      id: 'payout-1', shopId: 'shop-1', userId: null, verificationStatus: 'PENDING', disabledAt: null,
    });
    const service = new PayoutAccountService(
      prisma as never, walletService as never, authorization as never, security,
    );

    await service.verifyManually({
      payoutAccountId: 'payout-1', adminUserId: 'admin-1', resolvedAccountHolder: 'NGUYEN VAN A',
    });

    expect(tx.payoutAccount.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: expect.objectContaining({
        verificationStatus: 'VERIFIED', verificationMethod: 'MANUAL_BANK_APP',
        verifiedByUserId: 'admin-1', resolvedAccountHolder: 'NGUYEN VAN A',
      }),
    });
  });
});
