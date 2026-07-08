import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ModerateOfferUseCase } from './moderate-offer.use-case';

describe('ModerateOfferUseCase', () => {
  const updatedOffer = {
    id: 'offer-1',
    title: 'Offer',
    description: 'Description',
    price: 100,
    currency: 'VND',
    itemCondition: 'new',
    availableQuantity: 5,
    verificationLevel: 'standard',
    offerStatus: 'inactive',
    moderationStatus: 'rejected',
    moderationReason: 'Invalid claims',
    shopId: 'shop-1',
    categoryId: 'category-1',
    brandId: 'brand-1',
    gtin: null,
    verificationPolicy: 'manual_review',
    distributionNodeId: null,
    modelName: 'Model',
    createdAt: new Date(),
    shop: { shopName: 'Shop', registrationType: 'NORMAL' },
    category: { name: 'Category' },
  };

  it('updates only moderation fields and trims the reason', async () => {
    const repository = {
      moderateOffer: jest.fn().mockResolvedValue(updatedOffer),
    };
    const useCase = new ModerateOfferUseCase(repository as never);

    const result = await useCase.execute({
      offerId: 'offer-1',
      moderationStatus: 'rejected',
      moderationReason: '  Invalid claims  ',
    });

    expect(repository.moderateOffer).toHaveBeenCalledWith('offer-1', {
      moderationStatus: 'rejected',
      moderationReason: 'Invalid claims',
    });
    expect(result).toEqual(
      expect.objectContaining({
        moderationStatus: 'rejected',
        moderationReason: 'Invalid claims',
        offerStatus: 'inactive',
      }),
    );
  });

  it('preserves an explicit null reason', async () => {
    const repository = {
      moderateOffer: jest.fn().mockResolvedValue({
        ...updatedOffer,
        moderationStatus: 'approved',
        moderationReason: null,
      }),
    };
    const useCase = new ModerateOfferUseCase(repository as never);

    await useCase.execute({
      offerId: 'offer-1',
      moderationStatus: 'approved',
      moderationReason: null,
    });

    expect(repository.moderateOffer).toHaveBeenCalledWith('offer-1', {
      moderationStatus: 'approved',
      moderationReason: null,
    });
  });

  it('throws NotFoundException when the offer does not exist', async () => {
    const repository = { moderateOffer: jest.fn().mockResolvedValue(null) };
    const useCase = new ModerateOfferUseCase(repository as never);

    await expect(
      useCase.execute({
        offerId: 'missing',
        moderationStatus: 'banned',
        moderationReason: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects reasons longer than 1000 characters before persistence', async () => {
    const repository = { moderateOffer: jest.fn() };
    const useCase = new ModerateOfferUseCase(repository as never);

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        moderationStatus: 'rejected',
        moderationReason: 'x'.repeat(1001),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.moderateOffer).not.toHaveBeenCalled();
  });
});
