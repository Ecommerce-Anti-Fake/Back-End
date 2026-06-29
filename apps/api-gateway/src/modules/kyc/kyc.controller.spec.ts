import { KycController } from './kyc.controller';

describe('KycController', () => {
  it('submits KYC with only id type and front/back documents then returns success', async () => {
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
      controller.submitKyc('user-1', {
        idType: 'CCCD',
        documents: [
          {
            side: 'FRONT',
            assetType: 'IMAGE',
            mimeType: 'image/jpeg',
            fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front.jpg',
            publicId: 'kyc/user-1/front',
          },
          {
            side: 'BACK',
            assetType: 'IMAGE',
            mimeType: 'image/jpeg',
            fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/back.jpg',
            publicId: 'kyc/user-1/back',
          },
        ],
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
          fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front.jpg',
          publicId: 'kyc/user-1/front',
        },
        {
          side: 'BACK',
          assetType: 'IMAGE',
          mimeType: 'image/jpeg',
          fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/back.jpg',
          publicId: 'kyc/user-1/back',
        },
      ],
    });
    expect(dashboardSseBrokerService.notifyAccount).toHaveBeenCalledWith('user-1');
    expect(dashboardSseBrokerService.notifyAdminQueue).toHaveBeenCalledWith('moderation');
  });
});
