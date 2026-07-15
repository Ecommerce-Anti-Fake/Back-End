import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GetBuyNowOfferPreviewUseCase } from './get-buy-now-offer-preview.use-case';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';

describe('GetBuyNowOfferPreviewUseCase', () => {
  const repository = {
    findBuyNowOfferPreview: jest.fn(),
  };
  let useCase: GetBuyNowOfferPreviewUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetBuyNowOfferPreviewUseCase(repository as never);
  });

  it('rejects Buy Now when variantId is omitted', async () => {
    repository.findBuyNowOfferPreview.mockResolvedValue(
      offerFixture({
        price: '150000',
        availableQuantity: 4,
        media: [
          {
            mediaType: 'thumbnail',
            fileUrl: 'https://cdn.test/offer-file.jpg',
            mediaAsset: { secureUrl: 'https://cdn.test/offer-thumb.jpg' },
          },
        ],
      }),
    );

    await expect(
      useCase.execute({ offerId: 'offer-1', quantity: 2 }),
    ).rejects.toThrow('Variant is required for Buy Now.');
    expect(repository.findBuyNowOfferPreview).toHaveBeenCalledWith({
      offerId: 'offer-1',
      variantId: null,
    });
  });

  it('prefers active variant price and image when variantId is provided', async () => {
    repository.findBuyNowOfferPreview.mockResolvedValue(
      offerFixture({
        price: '150000',
        variants: [
          {
            id: 'variant-1',
            sku: 'RED-M',
            price: '175000',
            availableQuantity: 3,
            isActive: true,
            mediaAsset: { secureUrl: 'https://cdn.test/red-m.jpg' },
          },
        ],
      }),
    );

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 2,
      }),
    ).resolves.toMatchObject({
      variantId: 'variant-1',
      sku: 'RED-M',
      quantity: 2,
      price: 175000,
      thumbnailUrl: 'https://cdn.test/red-m.jpg',
    });
  });

  it('rejects variants without a configured price', async () => {
    repository.findBuyNowOfferPreview.mockResolvedValue(
      offerFixture({
        price: '150000',
        media: [
          {
            mediaType: 'gallery',
            fileUrl: 'https://cdn.test/gallery.jpg',
            mediaAsset: null,
          },
        ],
        variants: [
          {
            id: 'variant-1',
            sku: null,
            price: null,
            availableQuantity: 3,
            isActive: true,
            mediaAsset: null,
          },
        ],
      }),
    );

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 1,
      }),
    ).rejects.toThrow('Variant price is not configured.');
  });

  it('rejects missing, inactive, or unapproved offers', async () => {
    repository.findBuyNowOfferPreview.mockResolvedValueOnce(null);
    await expect(
      useCase.execute({ offerId: 'missing', quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository.findBuyNowOfferPreview.mockResolvedValueOnce(
      offerFixture({ offerStatus: 'inactive' }),
    );
    await expect(
      useCase.execute({ offerId: 'offer-1', quantity: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findBuyNowOfferPreview.mockResolvedValueOnce(
      offerFixture({ moderationStatus: 'pending' }),
    );
    await expect(
      useCase.execute({ offerId: 'offer-1', quantity: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing or inactive variants', async () => {
    repository.findBuyNowOfferPreview.mockResolvedValueOnce(
      offerFixture({ variants: [] }),
    );
    await expect(
      useCase.execute({
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findBuyNowOfferPreview.mockResolvedValueOnce(
      offerFixture({
        variants: [
          {
            id: 'variant-1',
            sku: 'RED-M',
            price: '175000',
            availableQuantity: 3,
            isActive: false,
            mediaAsset: null,
          },
        ],
      }),
    );
    await expect(
      useCase.execute({
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects quantities above the selected stock source', async () => {
    repository.findBuyNowOfferPreview.mockResolvedValueOnce(
      offerFixture({ availableQuantity: 1 }),
    );
    await expect(
      useCase.execute({ offerId: 'offer-1', quantity: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findBuyNowOfferPreview.mockResolvedValueOnce(
      offerFixture({
        variants: [
          {
            id: 'variant-1',
            sku: null,
            price: null,
            availableQuantity: 1,
            isActive: true,
            mediaAsset: null,
          },
        ],
      }),
    );
    await expect(
      useCase.execute({
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function offerFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1',
    shopId: 'shop-1',
    modelName: 'Kem chong nang SPF50',
    price: '150000',
    availableQuantity: 5,
    offerStatus: 'active',
    moderationStatus: 'approved',
    shop: {
      id: 'shop-1',
      shopName: 'Shop ABC',
    },
    media: [],
    variants: [],
    ...overrides,
  };
}
