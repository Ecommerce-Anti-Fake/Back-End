import { Test, TestingModule } from '@nestjs/testing';
import { GetAdminKycDetailUseCase } from './get-admin-kyc-detail.use-case';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

describe('GetAdminKycDetailUseCase', () => {
  let useCase: GetAdminKycDetailUseCase;

  const usersRepositoryMock = {
    findUserKycWithHistoryByUserId: jest.fn(),
    findAuditLogsByTarget: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAdminKycDetailUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetAdminKycDetailUseCase>(GetAdminKycDetailUseCase);
  });

  it('should return current KYC and submission history', async () => {
    usersRepositoryMock.findUserKycWithHistoryByUserId.mockResolvedValueOnce({
      id: 'kyc-1',
      userId: 'user-1',
      fullName: 'Nguyen Van A',
      verificationStatus: 'pending',
      reviewNote: null,
      verifiedAt: null,
      user: {
        email: 'user@example.com',
        phone: '0987654321',
        displayName: 'Nguyen Van A',
      },
      documents: [
        {
          side: 'FRONT',
          mediaAssetId: 'media-current-front',
          mediaAsset: {
            assetType: 'IMAGE',
            mimeType: 'image/jpeg',
            publicId: 'kyc/user-1/front-current',
            secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front-current.jpg',
          },
        },
      ],
      submissions: [
        {
          id: 'submission-2',
          submissionNumber: 2,
          verificationStatus: 'pending',
          reviewNote: null,
          reviewedAt: null,
          submittedAt: new Date('2026-04-16T09:00:00.000Z'),
          documents: [
            {
              side: 'FRONT',
              mediaAssetId: 'media-current-front',
              mediaAsset: {
                assetType: 'IMAGE',
                mimeType: 'image/jpeg',
                publicId: 'kyc/user-1/front-current',
                secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front-current.jpg',
              },
            },
          ],
        },
        {
          id: 'submission-1',
          submissionNumber: 1,
          verificationStatus: 'rejected',
          reviewNote: 'Anh mo',
          reviewedAt: new Date('2026-04-15T10:00:00.000Z'),
          submittedAt: new Date('2026-04-15T09:00:00.000Z'),
          documents: [
            {
              side: 'FRONT',
              mediaAssetId: 'media-old-front',
              mediaAsset: {
                assetType: 'IMAGE',
                mimeType: 'image/jpeg',
                publicId: 'kyc/user-1/front-old',
                secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kyc/user-1/front-old.jpg',
              },
            },
          ],
        },
      ],
    });
    usersRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([
      {
        id: 'audit-1',
        action: 'KYC_SUBMITTED',
        fromStatus: null,
        toStatus: 'pending',
        note: null,
        actorUserId: 'user-1',
        createdAt: new Date('2026-04-16T09:00:00.000Z'),
        actor: {
          displayName: 'Nguyen Van A',
          email: 'user@example.com',
        },
      },
    ]);

    const result = await useCase.execute('user-1');

    expect(result).toMatchObject({
      id: 'kyc-1',
      userId: 'user-1',
      verificationStatus: 'pending',
      currentDocuments: [{ mediaAssetId: 'media-current-front' }],
    });
    expect(result.submissions).toHaveLength(2);
    expect(result.submissions[0]).toMatchObject({
      id: 'submission-2',
      submissionNumber: 2,
      verificationStatus: 'pending',
    });
    expect(result.submissions[1]).toMatchObject({
      id: 'submission-1',
      submissionNumber: 1,
      verificationStatus: 'rejected',
      reviewNote: 'Anh mo',
    });
    expect(result.timeline).toMatchObject([
      {
        id: 'audit-1',
        action: 'KYC_SUBMITTED',
        toStatus: 'pending',
      },
    ]);
  });
});
