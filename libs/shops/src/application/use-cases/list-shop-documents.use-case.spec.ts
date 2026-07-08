import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { ListShopDocumentsUseCase } from './list-shop-documents.use-case';

describe('ListShopDocumentsUseCase', () => {
  const shopsRepositoryMock = {
    findOwnedShop: jest.fn(),
    findDocumentRequirementsForShop: jest.fn(),
    findShopDocumentsByShopId: jest.fn(),
  };
  let useCase: ListShopDocumentsUseCase;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ListShopDocumentsUseCase,
        { provide: ShopsRepository, useValue: shopsRepositoryMock },
      ],
    }).compile();

    useCase = module.get(ListShopDocumentsUseCase);
  });

  it('returns the latest submission for each required legal document', async () => {
    const olderUploadedAt = new Date('2026-07-07T10:00:00.000Z');
    const uploadedAt = new Date('2026-07-08T10:00:00.000Z');
    const file = {
      id: 'file-latest',
      fileUrl: 'https://example.com/latest.jpg',
      mediaAssetId: 'media-latest',
      sortOrder: 0,
      uploadedAt,
    };
    shopsRepositoryMock.findOwnedShop.mockResolvedValue({ id: 'shop-1' });
    shopsRepositoryMock.findDocumentRequirementsForShop.mockResolvedValue({
      requirements: [
        { requirementId: 'requirement-1', requirement: { code: 'BUSINESS_LICENSE' } },
        { requirementId: 'requirement-2', requirement: { code: 'HANDMADE_PROOF' } },
      ],
    });
    shopsRepositoryMock.findShopDocumentsByShopId.mockResolvedValue([
      {
        id: 'document-old',
        requirementId: 'requirement-1',
        docType: 'BUSINESS_LICENSE',
        files: [],
        reviewStatus: 'rejected',
        reviewNote: 'Old submission',
        reviewedAt: olderUploadedAt,
        uploadedAt: olderUploadedAt,
      },
      {
        id: 'document-latest',
        requirementId: 'requirement-1',
        docType: 'BUSINESS_LICENSE',
        files: [file],
        reviewStatus: 'pending',
        reviewNote: null,
        reviewedAt: null,
        uploadedAt,
      },
      {
        id: 'document-handmade',
        requirementId: 'requirement-2',
        docType: 'HANDMADE_PROOF',
        files: [],
        reviewStatus: 'approved',
        reviewNote: null,
        reviewedAt: uploadedAt,
        uploadedAt,
      },
      {
        id: 'unrelated-document',
        requirementId: 'unrelated-requirement',
        docType: 'BRAND_AUTHORIZATION',
        files: [],
        reviewStatus: 'pending',
        reviewNote: null,
        reviewedAt: null,
        uploadedAt,
      },
    ]);

    await expect(
      useCase.execute({ shopId: 'shop-1', requesterUserId: 'owner-1' }),
    ).resolves.toEqual([
      {
        id: 'document-latest',
        requirementId: 'requirement-1',
        docType: 'BUSINESS_LICENSE',
        fileUrl: file.fileUrl,
        mediaAssetId: file.mediaAssetId,
        files: [file],
        reviewStatus: 'pending',
        reviewNote: null,
        reviewedAt: null,
        uploadedAt,
      },
      expect.objectContaining({
        id: 'document-handmade',
        requirementId: 'requirement-2',
        docType: 'HANDMADE_PROOF',
      }),
    ]);
  });

  it('returns an empty array when no required legal document has been submitted', async () => {
    shopsRepositoryMock.findOwnedShop.mockResolvedValue({ id: 'shop-1' });
    shopsRepositoryMock.findDocumentRequirementsForShop.mockResolvedValue({
      requirements: [{ requirementId: 'requirement-1', requirement: { code: 'BUSINESS_LICENSE' } }],
    });
    shopsRepositoryMock.findShopDocumentsByShopId.mockResolvedValue([]);

    await expect(
      useCase.execute({ shopId: 'shop-1', requesterUserId: 'owner-1' }),
    ).resolves.toEqual([]);
  });

  it('rejects access to a shop not owned by the requester', async () => {
    shopsRepositoryMock.findOwnedShop.mockResolvedValue(null);

    await expect(
      useCase.execute({ shopId: 'shop-1', requesterUserId: 'user-2' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
