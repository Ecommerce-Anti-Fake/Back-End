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
    uploadCloudinaryBuffer: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
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

  it('should submit KYC with only id type and front/back CCCD images', async () => {
    usersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'buyer@example.com',
      phone: '0987654321',
      displayName: 'Nguyen Van A',
    });
    usersRepositoryMock.findUserKycByUserId.mockResolvedValueOnce(null);
    mediaServiceMock.uploadCloudinaryBuffer
      .mockResolvedValueOnce({
        publicId: 'kyc/user-1/front',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front.jpg',
      })
      .mockResolvedValueOnce({
        publicId: 'kyc/user-1/back',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/back.jpg',
      });
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
      idType: 'CCCD',
      documents: [
        {
          side: 'FRONT',
          assetType: 'IMAGE',
          mimeType: 'image/jpeg',
          file: {
            buffer: Buffer.from('front'),
            mimetype: 'image/jpeg',
            originalname: 'front.jpg',
            size: 5,
          },
        },
        {
          side: 'BACK',
          assetType: 'IMAGE',
          mimeType: 'image/jpeg',
          file: {
            buffer: Buffer.from('back'),
            mimetype: 'image/jpeg',
            originalname: 'back.jpg',
            size: 4,
          },
        },
      ],
    });

    expect(usersRepositoryMock.submitKyc).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        idType: 'CCCD',
        fullName: 'Nguyen Van A',
        dateOfBirth: new Date('1970-01-01T00:00:00.000Z'),
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

  it('uploads KYC front and back files before submitting', async () => {
    usersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'buyer@example.com',
      phone: '0987654321',
      displayName: 'Nguyen Van A',
    });
    usersRepositoryMock.findUserKycByUserId.mockResolvedValueOnce(null);
    mediaServiceMock.uploadCloudinaryBuffer
      .mockResolvedValueOnce({
        publicId: 'kyc/user-1/user-1-1',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front.jpg',
      })
      .mockResolvedValueOnce({
        publicId: 'kyc/user-1/user-1-2',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/back.jpg',
      });
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
            publicId: 'kyc/user-1/user-1-1',
            secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front.jpg',
          },
        },
        {
          side: 'BACK',
          mediaAssetId: 'media-back',
          mediaAsset: {
            assetType: 'IMAGE',
            mimeType: 'image/png',
            publicId: 'kyc/user-1/user-1-2',
            secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/back.jpg',
          },
        },
      ],
    });

    await useCase.execute({
      userId: 'user-1',
      idType: 'CCCD',
      documents: [
        {
          side: 'FRONT',
          assetType: 'IMAGE',
          mimeType: 'image/jpeg',
          file: {
            buffer: Buffer.from('front'),
            mimetype: 'image/jpeg',
            originalname: 'front.jpg',
            size: 5,
          },
        },
        {
          side: 'BACK',
          assetType: 'IMAGE',
          mimeType: 'image/png',
          file: {
            buffer: Buffer.from('back'),
            mimetype: 'image/png',
            originalname: 'back.png',
            size: 4,
          },
        },
      ],
    });

    expect(mediaServiceMock.uploadCloudinaryBuffer).toHaveBeenNthCalledWith(1, {
      buffer: Buffer.from('front'),
      folder: 'kyc/user-1',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      mimeType: 'image/jpeg',
      sequence: 1,
    });
    expect(mediaServiceMock.uploadCloudinaryBuffer).toHaveBeenNthCalledWith(2, {
      buffer: Buffer.from('back'),
      folder: 'kyc/user-1',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      mimeType: 'image/png',
      sequence: 2,
    });
    expect(usersRepositoryMock.submitKyc).toHaveBeenCalledWith(
      expect.objectContaining({
        documentMediaAssets: [
          { side: 'FRONT', mediaAssetId: 'media-front' },
          { side: 'BACK', mediaAssetId: 'media-back' },
        ],
      }),
    );
  });
});
