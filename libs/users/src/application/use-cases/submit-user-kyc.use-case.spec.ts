import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { SubmitUserKycUseCase } from './submit-user-kyc.use-case';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

describe('SubmitUserKycUseCase', () => {
  let useCase: SubmitUserKycUseCase;

  const usersRepositoryMock = {
    findUserById: jest.fn(),
    findUserKycByUserId: jest.fn(),
    findUserByEmailOrPhone: jest.fn(),
    submitKyc: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const mediaServiceMock = {
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitUserKycUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<SubmitUserKycUseCase>(SubmitUserKycUseCase);
  });

  it('should submit KYC with front and back CCCD images and update phone', async () => {
    usersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: null,
    });
    usersRepositoryMock.findUserKycByUserId.mockResolvedValueOnce(null);
    usersRepositoryMock.findUserByEmailOrPhone.mockResolvedValueOnce(null);
    mediaServiceMock.isOwnedCloudinaryUrl.mockReturnValue(true);
    mediaServiceMock.createCloudinaryAsset
      .mockResolvedValueOnce({
        id: 'media-front',
      })
      .mockResolvedValueOnce({
        id: 'media-back',
      });
    usersRepositoryMock.submitKyc.mockResolvedValueOnce({
      id: 'kyc-1',
      userId: 'user-1',
      fullName: 'Nguyen Van A',
      dateOfBirth: new Date('1998-05-10T00:00:00.000Z'),
      kycLevel: 'basic',
      idType: 'CCCD',
      idNumberHash: 'hash',
      verificationStatus: 'pending',
      verifiedAt: null,
      reviewNote: null,
      documents: [
        {
          side: 'FRONT',
          mediaAssetId: 'media-front',
          mediaAsset: {
            assetType: 'IMAGE',
            mimeType: 'image/jpeg',
            publicId: 'kyc/user-1/front',
            secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front.jpg',
          },
        },
        {
          side: 'BACK',
          mediaAssetId: 'media-back',
          mediaAsset: {
            assetType: 'IMAGE',
            mimeType: 'image/jpeg',
            publicId: 'kyc/user-1/back',
            secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/back.jpg',
          },
        },
      ],
    });

    const result = await useCase.execute({
      userId: 'user-1',
      fullName: 'Nguyen Van A',
      dateOfBirth: '1998-05-10',
      phone: '0987654321',
      idType: 'CCCD',
      idNumber: '079123456789',
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

    expect(usersRepositoryMock.submitKyc).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        phone: '0987654321',
        idType: 'CCCD',
        documentMediaAssets: [
          { side: 'FRONT', mediaAssetId: 'media-front' },
          { side: 'BACK', mediaAssetId: 'media-back' },
        ],
      }),
    );
    expect(result).toMatchObject({
      userId: 'user-1',
      verificationStatus: 'pending',
      documents: [
        { side: 'FRONT', mediaAssetId: 'media-front' },
        { side: 'BACK', mediaAssetId: 'media-back' },
      ],
    });
    expect(usersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'USER_KYC',
        action: 'KYC_SUBMITTED',
        toStatus: 'pending',
      }),
    );
  });
});
