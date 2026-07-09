import { Test } from '@nestjs/testing';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { CreateOfferVariantUseCase } from './create-offer-variant.use-case';

describe('CreateOfferVariantUseCase', () => {
  const repository = {
    findOwnedOfferOptionValues: jest.fn(),
    findMediaAssetById: jest.fn(),
    findOfferVariantByOptionValueIds: jest.fn(),
    createOfferVariant: jest.fn(),
  };
  let useCase: CreateOfferVariantUseCase;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CreateOfferVariantUseCase,
        { provide: OffersRepository, useValue: repository },
      ],
    }).compile();
    useCase = module.get(CreateOfferVariantUseCase);
  });

  it('rejects option values that do not all belong to the owned offer', async () => {
    repository.findOwnedOfferOptionValues.mockResolvedValueOnce({
      id: 'offer-1',
      optionGroups: [{ id: 'group-1', values: [{ id: 'value-1' }] }],
    });

    await expect(useCase.execute(baseInput())).rejects.toThrow(
      'All option values must belong to the offer',
    );
  });

  it('rejects two option values from the same option group', async () => {
    repository.findOwnedOfferOptionValues.mockResolvedValueOnce({
      id: 'offer-1',
      optionGroups: [
        {
          id: 'group-1',
          values: [{ id: 'value-1' }, { id: 'value-2' }],
        },
      ],
    });

    await expect(useCase.execute(baseInput())).rejects.toThrow(
      'A variant cannot contain multiple values from the same option group',
    );
  });

  it('rejects an existing option value combination', async () => {
    repository.findOwnedOfferOptionValues.mockResolvedValueOnce(validOffer());
    repository.findOfferVariantByOptionValueIds.mockResolvedValueOnce({
      id: 'variant-1',
    });

    await expect(useCase.execute(baseInput())).rejects.toThrow(
      'Variant option combination already exists',
    );
  });

  it('creates a normalized variant combination', async () => {
    repository.findOwnedOfferOptionValues.mockResolvedValueOnce(validOffer());
    repository.findOfferVariantByOptionValueIds.mockResolvedValueOnce(null);
    repository.findMediaAssetById.mockResolvedValueOnce({ id: 'media-1' });
    repository.createOfferVariant.mockResolvedValueOnce({
      id: 'variant-1',
      offerId: 'offer-1',
      sku: 'RED-M',
      price: 120000,
      availableQuantity: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      mediaAsset: { id: 'media-1', secureUrl: 'https://cdn.test/red-m.jpg' },
      values: [
        {
          optionValue: {
            id: 'value-1',
            text: 'Do',
            optionGroup: {
              id: 'group-1',
              displayName: 'Mau sac',
            },
          },
        },
        {
          optionValue: {
            id: 'value-2',
            text: 'M',
            optionGroup: {
              id: 'group-2',
              displayName: 'Kich thuoc',
            },
          },
        },
      ],
    });

    const result = await useCase.execute({
      ...baseInput(),
      mediaAssetId: 'media-1',
    });

    expect(repository.createOfferVariant).toHaveBeenCalledWith({
      offerId: 'offer-1',
      sku: 'RED-M',
      price: 120000,
      availableQuantity: 5,
      mediaAssetId: 'media-1',
      isActive: true,
      optionValueIds: ['value-1', 'value-2'],
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'variant-1',
        priceOverride: 120000,
        mediaAsset: { id: 'media-1', secureUrl: 'https://cdn.test/red-m.jpg' },
      }),
    );
  });

  function baseInput() {
    return {
      offerId: 'offer-1',
      sellerUserId: 'seller-1',
      sku: ' RED-M ',
      priceOverride: 120000,
      availableQuantity: 5,
      isActive: true,
      optionValueIds: ['value-2', 'value-1'],
    };
  }

  function validOffer() {
    return {
      id: 'offer-1',
      optionGroups: [
        { id: 'group-1', values: [{ id: 'value-1' }] },
        { id: 'group-2', values: [{ id: 'value-2' }] },
      ],
    };
  }
});
