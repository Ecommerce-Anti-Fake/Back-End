import { Test, TestingModule } from '@nestjs/testing';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { UpdateOfferUseCase } from './update-offer.use-case';

describe('UpdateOfferUseCase', () => {
  let useCase: UpdateOfferUseCase;

  const productRepositoryMock = {
    findOwnedOffer: jest.fn(),
    updateOwnedOffer: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOfferUseCase,
        { provide: ProductRepository, useValue: productRepositoryMock },
      ],
    }).compile();

    useCase = module.get<UpdateOfferUseCase>(UpdateOfferUseCase);
  });

  it('should reject invalid offer status', async () => {
    productRepositoryMock.findOwnedOffer.mockResolvedValueOnce({ id: 'offer-1' });

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        sellerUserId: 'user-1',
        offerStatus: 'archived',
      } as never),
    ).rejects.toThrow('Offer status must be active or inactive');
  });
});
