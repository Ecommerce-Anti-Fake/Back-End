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

  it('creates a PayOS top-up for an owned shop wallet', async () => {
    const prisma = {
      walletTopUp: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'top-up-shop-1',
          paymentLinkId: 'link-shop-1',
          checkoutUrl: 'https://pay/shop',
          amount: new Prisma.Decimal(250000),
          currency: 'VND',
          status: 'PENDING',
        }),
      },
    };
    const repository = {
      canAccessShopWallet: jest.fn().mockResolvedValue(true),
      findOrCreateShopWallet: jest.fn().mockResolvedValue({ id: 'wallet-shop-1' }),
    };
    const payOS = {
      createPaymentLink: jest.fn().mockResolvedValue({
        orderCode: '123',
        paymentLinkId: 'link-shop-1',
        checkoutUrl: 'https://pay/shop',
      }),
    };
    const useCase = new CreateWalletTopUpUseCase(
      prisma as never,
      repository as never,
      payOS as never,
    );

    await useCase.execute({
      userId: 'user-1',
      requesterRole: 'user',
      shopId: 'shop-1',
      amount: '250000',
      idempotencyKey: 'idem-1',
    });

    expect(repository.canAccessShopWallet).toHaveBeenCalledWith('shop-1', 'user-1', 'user');
    expect(repository.findOrCreateShopWallet).toHaveBeenCalledWith('shop-1', 'VND');
    expect(payOS.createPaymentLink).toHaveBeenCalledWith({
      amount: new Prisma.Decimal(250000),
      idempotencyKey: 'SHOP_TOP_UP:shop-1:idem-1',
      destination: 'SHOP',
    });
    expect(prisma.walletTopUp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'wallet-shop-1',
        idempotencyKey: 'SHOP_TOP_UP:shop-1:idem-1',
      }),
    });
  });
});
