import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { ReviewShopDocumentUseCase } from './review-shop-document.use-case';

describe('ReviewShopDocumentUseCase', () => {
  let useCase: ReviewShopDocumentUseCase;

  const shopsRepositoryMock = {
    findAdminShopVerificationDetailById: jest.fn(),
    reviewShopDocumentsAndOwnerKyc: jest.fn(),
    recomputeShopStatus: jest.fn(),
    updateShopStatus: jest.fn(),
    createAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewShopDocumentUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ReviewShopDocumentUseCase>(ReviewShopDocumentUseCase);
  });

  it('reviews shop legal documents and owner KYC using only shop id', async () => {
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'owner-1',
      owner: {
        kyc: {
          id: 'kyc-1',
          verificationStatus: 'pending',
          documents: [{ side: 'FRONT' }, { side: 'BACK' }],
        },
      },
      shopType: {
        requirements: [
          { required: true, requirement: { id: 'requirement-1' } },
          { required: true, requirement: { id: 'requirement-2' } },
        ],
      },
      documents: [
        { id: 'doc-1', requirementId: 'requirement-1', reviewStatus: 'pending', docType: 'BUSINESS_LICENSE' },
        { id: 'doc-2', requirementId: 'requirement-2', reviewStatus: 'pending', docType: 'TAX_REGISTRATION' },
      ],
    });
    shopsRepositoryMock.reviewShopDocumentsAndOwnerKyc.mockResolvedValueOnce({
      reviewedShopDocumentIds: ['doc-1', 'doc-2'],
      reviewedKyc: true,
    });
    shopsRepositoryMock.recomputeShopStatus.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'owner-1',
      shopStatus: 'verified',
    });

    const result = await useCase.execute({
      shopId: 'shop-1',
      reviewerUserId: 'admin-1',
      reviewStatus: 'approved',
      reviewNote: null,
    });

    expect(shopsRepositoryMock.reviewShopDocumentsAndOwnerKyc).toHaveBeenCalledWith({
      shopId: 'shop-1',
      ownerUserId: 'owner-1',
      reviewStatus: 'approved',
      reviewNote: null,
    });
    expect(shopsRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'SHOP_VERIFICATION',
        targetId: 'shop-1',
        actorUserId: 'admin-1',
        action: 'SHOP_REGISTRATION_REVIEWED',
        toStatus: 'verified',
        metadata: {
          reviewStatus: 'approved',
          reviewedKyc: true,
          reviewedShopDocumentIds: ['doc-1', 'doc-2'],
        },
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Đã xử lý hồ sơ đăng ký shop.',
    });
  });

  it('requires owner KYC with front and back CCCD documents before review', async () => {
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'owner-1',
      owner: {
        kyc: {
          id: 'kyc-1',
          verificationStatus: 'pending',
          documents: [{ side: 'FRONT' }],
        },
      },
      documents: [{ id: 'doc-1', reviewStatus: 'pending', docType: 'BUSINESS_LICENSE' }],
    });

    await expect(
      useCase.execute({
        shopId: 'shop-1',
        reviewerUserId: 'admin-1',
        reviewStatus: 'approved',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sets shop status to rejected when admin rejects the registration', async () => {
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'owner-1',
      shopStatus: 'pending_verification',
      owner: { kyc: { documents: [{ side: 'FRONT' }, { side: 'BACK' }] } },
      shopType: {
        requirements: [{ required: true, requirement: { id: 'requirement-1' } }],
      },
      documents: [{ id: 'doc-1', requirementId: 'requirement-1', reviewStatus: 'pending' }],
    });
    shopsRepositoryMock.reviewShopDocumentsAndOwnerKyc.mockResolvedValueOnce({
      reviewedShopDocumentIds: ['doc-1'],
      reviewedKyc: true,
    });
    shopsRepositoryMock.updateShopStatus.mockResolvedValueOnce({
      id: 'shop-1',
      ownerUserId: 'owner-1',
      shopStatus: 'rejected',
    });

    await useCase.execute({
      shopId: 'shop-1',
      reviewerUserId: 'admin-1',
      reviewStatus: 'rejected',
      reviewNote: 'Document is unreadable',
    });

    expect(shopsRepositoryMock.updateShopStatus).toHaveBeenCalledWith('shop-1', 'rejected');
    expect(shopsRepositoryMock.recomputeShopStatus).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when shop does not exist', async () => {
    shopsRepositoryMock.findAdminShopVerificationDetailById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        shopId: 'missing-shop',
        reviewerUserId: 'admin-1',
        reviewStatus: 'approved',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
