import { KycController } from './kyc.controller';

describe('KycController', () => {
  it('submits KYC with front/back image files then returns success', async () => {
    const usersRpcService = {
      submitKyc: jest.fn().mockResolvedValue({
        id: 'kyc-1',
        verificationStatus: 'pending',
      }),
    };
    const dashboardSseBrokerService = {
      notifyAccount: jest.fn(),
      notifyAdminQueue: jest.fn(),
    };
    const controller = new KycController(usersRpcService as never, dashboardSseBrokerService as never);
    const front = {
      buffer: Buffer.from('front'),
      mimetype: 'image/jpeg',
      originalname: 'front.jpg',
      size: 5,
    };
    const back = {
      buffer: Buffer.from('back'),
      mimetype: 'image/png',
      originalname: 'back.png',
      size: 4,
    };

    await expect(
      controller.submitKyc('user-1', 'CCCD', {
        front: [front],
        back: [back],
      }),
    ).resolves.toEqual({ success: true });

    expect(usersRpcService.submitKyc).toHaveBeenCalledWith({
      userId: 'user-1',
      idType: 'CCCD',
      documents: [
        {
          side: 'FRONT',
          assetType: 'IMAGE',
          mimeType: 'image/jpeg',
          file: front,
        },
        {
          side: 'BACK',
          assetType: 'IMAGE',
          mimeType: 'image/png',
          file: back,
        },
      ],
    });
    expect(dashboardSseBrokerService.notifyAccount).toHaveBeenCalledWith('user-1');
    expect(dashboardSseBrokerService.notifyAdminQueue).toHaveBeenCalledWith('moderation');
  });

  it('rejects missing KYC image files', async () => {
    const usersRpcService = {
      submitKyc: jest.fn().mockResolvedValue({
        id: 'kyc-1',
        verificationStatus: 'pending',
      }),
    };
    const dashboardSseBrokerService = {
      notifyAccount: jest.fn(),
      notifyAdminQueue: jest.fn(),
    };
    const controller = new KycController(usersRpcService as never, dashboardSseBrokerService as never);

    await expect(
      controller.submitKyc('user-1', 'CCCD', { front: [] }),
    ).rejects.toThrow('KYC files must include front and back images');
    expect(usersRpcService.submitKyc).not.toHaveBeenCalled();
  });
});
