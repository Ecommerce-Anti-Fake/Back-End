import { Prisma } from '@prisma/client';
import { RequestWalletWithdrawalUseCase } from './request-wallet-withdrawal.use-case';

describe('RequestWalletWithdrawalUseCase', () => {
  const now = new Date('2026-07-22T05:00:00.000Z');
  const payoutAccount = {
    id: 'payout-1', userId: null, shopId: 'shop-1', bankBin: '970436', bankCode: 'VCB',
    bankName: 'Vietcombank', accountNumberEncrypted: 'v1:encrypted', accountNumberLast4: '6789',
    accountNumberLength: 10, declaredAccountHolder: 'NGUYEN VAN A', resolvedAccountHolder: 'NGUYEN VAN A',
    verificationStatus: 'VERIFIED', availableAfter: new Date('2026-07-21T05:00:00.000Z'), disabledAt: null,
  };
  const tx = {
    walletWithdrawal: { findUnique: jest.fn(), create: jest.fn() },
    payoutAccount: { findUnique: jest.fn() },
    codShopSettlement: { count: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const walletService = { canAccessShopWallet: jest.fn() };
  const walletRepository = {
    findShopWalletInTransaction: jest.fn(),
    findUserWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };
  const authorization = { consumeInTransaction: jest.fn() };
  const config = { get: jest.fn((name: string) => name === 'BUYER_WITHDRAWALS_ENABLED' ? 'false' : 'true') };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now.getTime());
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    walletService.canAccessShopWallet.mockResolvedValue(true);
    walletRepository.findShopWalletInTransaction.mockResolvedValue({
      id: 'wallet-1', availableBalance: new Prisma.Decimal('500000'), lockedBalance: new Prisma.Decimal('0'),
    });
    walletRepository.executeTransactionInTransaction.mockResolvedValue({ id: 'transaction-1' });
    tx.payoutAccount.findUnique.mockResolvedValue(payoutAccount);
    tx.walletWithdrawal.findUnique.mockResolvedValue(null);
    tx.codShopSettlement.count.mockResolvedValue(0);
    tx.walletWithdrawal.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'withdrawal-1', status: 'PENDING', createdAt: now, processedAt: null, ...data,
    }));
  });

  afterEach(() => jest.useRealTimers());

  it('consumes authorization and locks available funds for a verified same-owner payout account', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user', amount: '100000.00',
      payoutAccountId: 'payout-1', idempotencyKey: 'retry-key-1', authorizationToken: 'one-time-token',
    });

    expect(authorization.consumeInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      operation: 'CREATE_WITHDRAWAL', walletId: 'wallet-1', payoutAccountId: 'payout-1',
      payload: { amount: '100000.00' },
    }));
    expect(tx.walletWithdrawal.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      idempotencyKey: 'WITHDRAWAL:owner-1:retry-key-1',
      payoutAccountId: 'payout-1', accountNumber: null,
      accountNumberEncryptedSnapshot: 'v1:encrypted', accountNumberLast4: '6789',
    }) });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'WITHDRAWAL_REQUEST',
      entries: [
        expect.objectContaining({ direction: 'DEBIT', balanceType: 'AVAILABLE', amount: new Prisma.Decimal('100000.00') }),
        expect.objectContaining({ direction: 'CREDIT', balanceType: 'LOCKED', amount: new Prisma.Decimal('100000.00') }),
      ],
    }));
    expect(result.accountNumberMasked).toBe('******6789');
    expect(result).not.toHaveProperty('accountNumber');
  });

  it('rejects amounts below 100,000 VND before consuming authorization', async () => {
    await expect(createUseCase().execute({
      shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user', amount: '99999',
      payoutAccountId: 'payout-1', idempotencyKey: 'key', authorizationToken: 'token',
    })).rejects.toThrow('Minimum withdrawal amount is 100000 VND');
    expect(authorization.consumeInTransaction).not.toHaveBeenCalled();
  });

  it('rejects an unverified or cooling-down payout account', async () => {
    tx.payoutAccount.findUnique.mockResolvedValueOnce({ ...payoutAccount, verificationStatus: 'PENDING' });
    await expect(createUseCase().execute({
      shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user', amount: '100000',
      payoutAccountId: 'payout-1', idempotencyKey: 'key-1', authorizationToken: 'token',
    })).rejects.toThrow('Payout account is not verified');

    tx.payoutAccount.findUnique.mockResolvedValueOnce({ ...payoutAccount, availableAfter: new Date('2026-07-23T05:00:00.000Z') });
    await expect(createUseCase().execute({
      shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user', amount: '100000',
      payoutAccountId: 'payout-1', idempotencyKey: 'key-2', authorizationToken: 'token',
    })).rejects.toThrow('Payout account is in the security cooldown period');
  });

  it('returns the original withdrawal for an idempotent retry without locking twice', async () => {
    tx.walletWithdrawal.findUnique.mockResolvedValueOnce({
      id: 'withdrawal-existing', walletId: 'wallet-1', payoutAccountId: 'payout-1', amount: new Prisma.Decimal('100000'),
      bankName: 'Vietcombank', accountHolder: 'NGUYEN VAN A', accountNumberLast4: '6789',
      status: 'PENDING', createdAt: now, processedAt: null,
    });

    const result = await createUseCase().execute({
      shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user', amount: '100000',
      payoutAccountId: 'payout-1', idempotencyKey: 'retry-key', authorizationToken: 'token',
    });

    expect(result.id).toBe('withdrawal-existing');
    expect(authorization.consumeInTransaction).not.toHaveBeenCalled();
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('keeps buyer withdrawal disabled by default', async () => {
    await expect(createUseCase().execute({
      requesterUserId: 'buyer-1', requesterRole: 'user', amount: '100000',
      payoutAccountId: 'payout-1', idempotencyKey: 'key', authorizationToken: 'token',
    })).rejects.toThrow('Buyer withdrawals are not enabled');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks a new shop withdrawal while COD obligations are outstanding', async () => {
    tx.codShopSettlement.count.mockResolvedValueOnce(1);

    await expect(createUseCase().execute({
      shopId: 'shop-1',
      requesterUserId: 'owner-1',
      requesterRole: 'user',
      amount: '100000',
      payoutAccountId: 'payout-1',
      idempotencyKey: 'cod-debt-key',
      authorizationToken: 'token',
    })).rejects.toThrow('Outstanding COD obligations must be paid before withdrawing');
    expect(authorization.consumeInTransaction).not.toHaveBeenCalled();
  });

  function createUseCase() {
    return new RequestWalletWithdrawalUseCase(
      prisma as never, walletService as never, walletRepository as never, authorization as never, config as never,
    );
  }
});
