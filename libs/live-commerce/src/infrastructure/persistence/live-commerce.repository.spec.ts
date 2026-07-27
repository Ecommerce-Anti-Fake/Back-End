import { LiveCommerceRepository } from './live-commerce.repository';

describe('LiveCommerceRepository', () => {
  it('does not overwrite a provider connection that wins the start race', async () => {
    const connectedSession = {
      id: 'live-1',
      status: 'LIVE',
      providerStatus: 'CONNECTED',
    };
    const prisma = {
      liveCommerceSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(connectedSession),
      },
    };
    const repository = new LiveCommerceRepository(prisma as never);

    await expect(
      repository.markLiveSessionStarting({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
      }),
    ).resolves.toBe(connectedSession);
    expect(prisma.liveCommerceSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'live-1',
        status: 'SCHEDULED',
      },
      data: {
        providerStatus: 'STARTING',
        providerErrorCode: null,
        providerErrorMessage: null,
      },
    });
  });
});
