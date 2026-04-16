import { Test, TestingModule } from '@nestjs/testing';
import { ListPendingKycsUseCase } from './list-pending-kycs.use-case';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

describe('ListPendingKycsUseCase', () => {
  let useCase: ListPendingKycsUseCase;

  const usersRepositoryMock = {
    findPendingKycs: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPendingKycsUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ListPendingKycsUseCase>(ListPendingKycsUseCase);
  });

  it('should return admin-facing pending KYC list', async () => {
    usersRepositoryMock.findPendingKycs.mockResolvedValueOnce([
      {
        id: 'kyc-1',
        userId: 'user-1',
        fullName: 'Nguyen Van A',
        verificationStatus: 'pending',
        idType: 'CCCD',
        user: {
          email: 'user@example.com',
          phone: '0987654321',
        },
        documents: [
          {
            side: 'FRONT',
            uploadedAt: new Date('2026-04-15T10:00:00.000Z'),
            mediaAssetId: 'media-1',
            mediaAsset: {
              assetType: 'IMAGE',
              mimeType: 'image/jpeg',
              publicId: 'kyc/user-1/front',
              secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front.jpg',
            },
          },
        ],
      },
    ]);

    const result = await useCase.execute();

    expect(result).toMatchObject([
      {
        id: 'kyc-1',
        userId: 'user-1',
        fullName: 'Nguyen Van A',
        email: 'user@example.com',
        phone: '0987654321',
        verificationStatus: 'pending',
        idType: 'CCCD',
      },
    ]);
  });
});
