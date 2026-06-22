import { Test, TestingModule } from '@nestjs/testing';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';
import { DeleteOfferDocumentUseCase } from './delete-offer-document.use-case';

describe('DeleteOfferDocumentUseCase in OfferAssetsModule', () => {
  let useCase: DeleteOfferDocumentUseCase;

  const repositoryMock = {
    findOwnedOfferDocument: jest.fn(),
    deleteOfferDocument: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteOfferDocumentUseCase,
        { provide: OfferAssetsRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<DeleteOfferDocumentUseCase>(
      DeleteOfferDocumentUseCase,
    );
  });

  it('should delete owned offer document', async () => {
    repositoryMock.findOwnedOfferDocument.mockResolvedValueOnce({
      id: 'document-1',
    });

    const result = await useCase.execute({
      offerId: 'offer-1',
      documentId: 'document-1',
      requesterUserId: 'seller-1',
    });

    expect(repositoryMock.deleteOfferDocument).toHaveBeenCalledWith(
      'document-1',
    );
    expect(result).toEqual({ deleted: true });
  });
});
