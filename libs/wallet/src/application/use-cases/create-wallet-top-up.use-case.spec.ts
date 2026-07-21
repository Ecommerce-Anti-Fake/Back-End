import { Prisma } from '@prisma/client';
import { CreateWalletTopUpUseCase } from './create-wallet-top-up.use-case';

describe('CreateWalletTopUpUseCase', () => {
  it('returns the existing top-up for a retried idempotency key', async () => {
    const existing = { id: 'top-up-1', paymentLinkId: 'link-1', checkoutUrl: 'https://pay', amount: new Prisma.Decimal(100000), currency: 'VND', status: 'PENDING' };
    const prisma = { walletTopUp: { findUnique: jest.fn().mockResolvedValue(existing) } };
    const useCase = new CreateWalletTopUpUseCase(prisma as never, {} as never, {} as never);

    await expect(useCase.execute({ userId: 'user-1', amount: '100000', idempotencyKey: 'idem-1' })).resolves.toEqual({ topUpId: 'top-up-1', paymentLinkId: 'link-1', checkoutUrl: 'https://pay', amount: '100000.00', currency: 'VND', status: 'PENDING' });
  });

  it('rejects non-integer or non-positive VND amounts before provider calls', async () => {
    const prisma = { walletTopUp: { findUnique: jest.fn().mockResolvedValue(null) } };
    const payOS = { createPaymentLink: jest.fn() };
    const useCase = new CreateWalletTopUpUseCase(prisma as never, {} as never, payOS as never);

    await expect(useCase.execute({ userId: 'user-1', amount: '100.50', idempotencyKey: 'idem-1' })).rejects.toThrow('Số tiền nạp');
    expect(payOS.createPaymentLink).not.toHaveBeenCalled();
  });
});
