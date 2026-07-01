import { NotFoundException } from '@nestjs/common';
import { GetCheckoutSessionStatusUseCase } from './get-checkout-session-status.use-case';

describe('GetCheckoutSessionStatusUseCase', () => {
  const ordersRepository = {
    findCheckoutSessionByIdForBuyer: jest.fn(),
  };

  let useCase: GetCheckoutSessionStatusUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new GetCheckoutSessionStatusUseCase(ordersRepository as never);
  });

  it('returns only checkout session payment status for the current buyer', async () => {
    ordersRepository.findCheckoutSessionByIdForBuyer.mockResolvedValueOnce({
      id: 'checkout-session-1',
      buyerUserId: 'buyer-user-1',
      paymentStatus: 'PENDING',
    });

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-user-1',
        checkoutSessionId: 'checkout-session-1',
      }),
    ).resolves.toEqual({ status: 'PENDING' });
  });

  it('rejects missing or foreign checkout sessions', async () => {
    ordersRepository.findCheckoutSessionByIdForBuyer.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-user-1',
        checkoutSessionId: 'checkout-session-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
