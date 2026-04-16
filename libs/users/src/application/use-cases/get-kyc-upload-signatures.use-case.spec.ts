import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { GetKycUploadSignaturesUseCase } from './get-kyc-upload-signatures.use-case';

describe('GetKycUploadSignaturesUseCase', () => {
  let useCase: GetKycUploadSignaturesUseCase;

  const mediaServiceMock = {
    createCloudinaryUploadSignature: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetKycUploadSignaturesUseCase,
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<GetKycUploadSignaturesUseCase>(GetKycUploadSignaturesUseCase);
  });

  it('should return front and back upload signatures for KYC documents', async () => {
    mediaServiceMock.createCloudinaryUploadSignature
      .mockReturnValueOnce({
        folder: 'kyc/user-1',
        publicId: 'kyc/user-1/user-1-1',
        uploadResourceType: 'image',
      })
      .mockReturnValueOnce({
        folder: 'kyc/user-1',
        publicId: 'kyc/user-1/user-1-2',
        uploadResourceType: 'image',
      });

    const result = await useCase.execute({
      userId: 'user-1',
      items: [{ side: 'FRONT' }, { side: 'BACK' }],
    });

    expect(result).toHaveLength(2);
    expect(mediaServiceMock.createCloudinaryUploadSignature).toHaveBeenNthCalledWith(1, {
      folder: 'kyc/user-1',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      sequence: 1,
    });
  });
});
