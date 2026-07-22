import { Prisma } from '@prisma/client';
import { PayoutAccountSecurityService } from '../../domain';
import { WithdrawalAuthorizationService } from './withdrawal-authorization.service';

describe('WithdrawalAuthorizationService', () => {
  const now = new Date('2026-07-22T05:00:00.000Z');
  const challenge = {
    id: 'challenge-1',
    userId: 'user-1',
    walletId: 'wallet-1',
    payoutAccountId: 'payout-1',
    operation: 'CREATE_WITHDRAWAL',
    channel: 'EMAIL',
    operationDigest: 'digest',
    failedAttempts: 0,
    lockedUntil: null,
    verifiedAt: null,
    expiresAt: new Date('2026-07-22T05:05:00.000Z'),
    consumedAt: null,
    createdAt: new Date('2026-07-22T04:59:30.000Z'),
  };
  const prisma = {
    withdrawalAuthorization: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  const firebaseVerifier = { verifyIdToken: jest.fn() };
  const walletService = {};
  const security = new PayoutAccountSecurityService({
    get: jest.fn(() => '22'.repeat(32)),
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now.getTime());
    prisma.withdrawalAuthorization.findFirst.mockResolvedValue(challenge);
    prisma.withdrawalAuthorization.update.mockResolvedValue(challenge);
    prisma.withdrawalAuthorization.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'owner@example.com', phone: '+84901234567' });
    firebaseVerifier.verifyIdToken.mockResolvedValue({
      uid: 'firebase-user',
      email: 'owner@example.com',
      emailVerified: true,
      authTime: Math.floor(now.getTime() / 1000),
    });
  });

  afterEach(() => jest.useRealTimers());

  it('issues only a hashed one-time token after a fresh matching Firebase proof', async () => {
    const service = new WithdrawalAuthorizationService(
      prisma as never, walletService as never, firebaseVerifier as never, security,
    );

    const result = await service.verifyChallenge({
      challengeId: 'challenge-1', userId: 'user-1', firebaseIdToken: 'firebase-id-token',
    });

    expect(result.authorizationToken).toBeTruthy();
    expect(prisma.withdrawalAuthorization.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'challenge-1', verifiedAt: null }),
      data: expect.objectContaining({ authorizationTokenHash: expect.any(String), verifiedAt: now }),
    }));
    expect(prisma.withdrawalAuthorization.updateMany.mock.calls[0][0].data.authorizationTokenHash)
      .not.toBe(result.authorizationToken);
  });

  it('rejects expired challenges before checking Firebase', async () => {
    prisma.withdrawalAuthorization.findFirst.mockResolvedValueOnce({
      ...challenge, expiresAt: new Date('2026-07-22T04:59:59.000Z'),
    });
    const service = new WithdrawalAuthorizationService(
      prisma as never, walletService as never, firebaseVerifier as never, security,
    );

    await expect(service.verifyChallenge({
      challengeId: 'challenge-1', userId: 'user-1', firebaseIdToken: 'token',
    })).rejects.toThrow('Authorization challenge has expired');
    expect(firebaseVerifier.verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects a Firebase contact that does not belong to the current user', async () => {
    firebaseVerifier.verifyIdToken.mockResolvedValueOnce({
      email: 'attacker@example.com', emailVerified: true, authTime: Math.floor(now.getTime() / 1000),
    });
    const service = new WithdrawalAuthorizationService(
      prisma as never, walletService as never, firebaseVerifier as never, security,
    );

    await expect(service.verifyChallenge({
      challengeId: 'challenge-1', userId: 'user-1', firebaseIdToken: 'token',
    })).rejects.toThrow('Firebase contact does not match the current user');
  });

  it('locks verification for 30 minutes after the fifth failed proof', async () => {
    prisma.withdrawalAuthorization.findFirst.mockResolvedValueOnce({ ...challenge, failedAttempts: 4 });
    firebaseVerifier.verifyIdToken.mockResolvedValueOnce({
      email: 'attacker@example.com', emailVerified: true, authTime: Math.floor(now.getTime() / 1000),
    });
    const service = new WithdrawalAuthorizationService(
      prisma as never, walletService as never, firebaseVerifier as never, security,
    );

    await expect(service.verifyChallenge({
      challengeId: 'challenge-1', userId: 'user-1', firebaseIdToken: 'token',
    })).rejects.toThrow('Firebase contact does not match the current user');
    expect(prisma.withdrawalAuthorization.update).toHaveBeenCalledWith({
      where: { id: 'challenge-1' },
      data: { failedAttempts: 5, lockedUntil: new Date('2026-07-22T05:30:00.000Z') },
    });
  });

  it('allows only one concurrent proof to issue a token', async () => {
    prisma.withdrawalAuthorization.updateMany.mockResolvedValueOnce({ count: 0 });
    const service = new WithdrawalAuthorizationService(
      prisma as never, walletService as never, firebaseVerifier as never, security,
    );

    await expect(service.verifyChallenge({
      challengeId: 'challenge-1', userId: 'user-1', firebaseIdToken: 'token',
    })).rejects.toThrow('Authorization challenge has already been used');
  });

  it('consumes a token once and rejects a changed amount', async () => {
    const payload = { amount: '100000.00' };
    const operationDigest = security.operationDigest({
      operation: 'CREATE_WITHDRAWAL', walletId: 'wallet-1', payoutAccountId: 'payout-1', ...payload,
    });
    const tx = {
      withdrawalAuthorization: {
        findUnique: jest.fn().mockResolvedValue({
          ...challenge,
          operationDigest,
          authorizationTokenHash: security.tokenHash('authorization-token'),
          verifiedAt: now,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new WithdrawalAuthorizationService(
      prisma as never, walletService as never, firebaseVerifier as never, security,
    );

    await service.consumeInTransaction(tx as never, {
      authorizationToken: 'authorization-token', userId: 'user-1', walletId: 'wallet-1',
      payoutAccountId: 'payout-1', operation: 'CREATE_WITHDRAWAL', payload,
    });
    await expect(service.consumeInTransaction(tx as never, {
      authorizationToken: 'authorization-token', userId: 'user-1', walletId: 'wallet-1',
      payoutAccountId: 'payout-1', operation: 'CREATE_WITHDRAWAL', payload: { amount: '200000.00' },
    })).rejects.toThrow('Authorization token does not match this operation');
    expect(tx.withdrawalAuthorization.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rejects replay when atomic token consumption loses the race', async () => {
    const payload = { amount: new Prisma.Decimal('100000').toFixed(2) };
    const tx = {
      withdrawalAuthorization: {
        findUnique: jest.fn().mockResolvedValue({
          ...challenge,
          operationDigest: security.operationDigest({
            operation: 'CREATE_WITHDRAWAL', walletId: 'wallet-1', payoutAccountId: 'payout-1', ...payload,
          }),
          authorizationTokenHash: security.tokenHash('authorization-token'),
          verifiedAt: now,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new WithdrawalAuthorizationService(
      prisma as never, walletService as never, firebaseVerifier as never, security,
    );

    await expect(service.consumeInTransaction(tx as never, {
      authorizationToken: 'authorization-token', userId: 'user-1', walletId: 'wallet-1',
      payoutAccountId: 'payout-1', operation: 'CREATE_WITHDRAWAL', payload,
    })).rejects.toThrow('Authorization token has already been used');
  });
});
