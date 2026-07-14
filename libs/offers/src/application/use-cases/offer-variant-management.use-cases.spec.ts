import { DeleteOfferVariantUseCase } from './delete-offer-variant.use-case';
import { ListOfferVariantsUseCase } from './list-offer-variants.use-case';
import { UpdateOfferVariantUseCase } from './update-offer-variant.use-case';

const variant = {
  id: 'variant-1',
  offerId: 'offer-1',
  sku: 'AO-DEN-M',
  price: 120000,
  availableQuantity: 10,
  mediaAsset: null,
  isActive: true,
  values: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('offer variant management use cases', () => {
  it('lists owned variants with the active filter', async () => {
    const repository = {
      findOwnedOfferVariants: jest.fn().mockResolvedValue([variant]),
    };
    const useCase = new ListOfferVariantsUseCase(repository as never);
    const result = await useCase.execute({
      offerId: 'offer-1',
      sellerUserId: 'seller-1',
      isActive: true,
    });
    expect(repository.findOwnedOfferVariants).toHaveBeenCalledWith({
      offerId: 'offer-1',
      sellerUserId: 'seller-1',
      isActive: true,
    });
    expect(result).toHaveLength(1);
  });

  it('updates seller-managed fields without option values', async () => {
    const repository = {
      updateOwnedOfferVariant: jest.fn().mockResolvedValue(variant),
    };
    const mediaService = {
      uploadCloudinaryBuffer: jest.fn().mockResolvedValue({ publicId: 'variant-1', secureUrl: 'https://cdn/variant.png' }),
      createCloudinaryAsset: jest.fn().mockResolvedValue({ id: 'media-1' }),
    };
    const useCase = new UpdateOfferVariantUseCase(repository as never, mediaService as never);
    await useCase.execute({
      offerId: 'offer-1',
      variantId: 'variant-1',
      sellerUserId: 'seller-1',
      priceOverride: 0,
      availableQuantity: 10,
      image: 'data:image/png;base64,dmFyaWFudA==',
    });
    expect(repository.updateOwnedOfferVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          price: 0,
          availableQuantity: 10,
          mediaAssetId: 'media-1',
        },
      }),
    );
  });

  it('soft deletes by clearing active price and quantity', async () => {
    const repository = {
      updateOwnedOfferVariant: jest.fn().mockResolvedValue({
        ...variant,
        price: 0,
        availableQuantity: 0,
        isActive: false,
      }),
    };
    const useCase = new DeleteOfferVariantUseCase(repository as never);
    const result = await useCase.execute({
      offerId: 'offer-1',
      variantId: 'variant-1',
      sellerUserId: 'seller-1',
    });
    expect(repository.updateOwnedOfferVariant).toHaveBeenCalledWith({
      offerId: 'offer-1',
      variantId: 'variant-1',
      sellerUserId: 'seller-1',
      data: { isActive: false, price: 0, availableQuantity: 0 },
    });
    expect(result).toEqual({ success: true, message: 'Xoa variant thanh cong.' });
  });
});
