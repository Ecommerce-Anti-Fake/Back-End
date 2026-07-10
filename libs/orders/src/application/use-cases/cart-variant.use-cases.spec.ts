import { BadRequestException } from '@nestjs/common';
import { AddCartItemUseCase } from './add-cart-item.use-case';
import { UpdateCartItemUseCase } from './update-cart-item.use-case';

describe('cart variant use cases', () => {
  let ordersRepository: {
    findOfferForOrdering: jest.Mock;
    findOfferVariantForCart: jest.Mock;
    upsertCartItem: jest.Mock;
    findCartItemById: jest.Mock;
    updateCartItemQuantity: jest.Mock;
  };

  beforeEach(() => {
    ordersRepository = {
      findOfferForOrdering: jest.fn(),
      findOfferVariantForCart: jest.fn(),
      upsertCartItem: jest.fn(),
      findCartItemById: jest.fn(),
      updateCartItemQuantity: jest.fn(),
    };
  });

  it('adds a cart item with a selected active variant and snapshots variant price', async () => {
    const useCase = new AddCartItemUseCase(ordersRepository as never);
    ordersRepository.findOfferForOrdering.mockResolvedValue(
      createOffer({ hasVariants: true }),
    );
    ordersRepository.findOfferVariantForCart.mockResolvedValue(
      createVariant({ price: 120000, availableQuantity: 5 }),
    );
    ordersRepository.upsertCartItem.mockResolvedValue(createCart());

    await useCase.execute({
      buyerUserId: 'buyer-1',
      offerId: 'offer-1',
      variantId: 'variant-1',
      quantity: 2,
    });

    expect(ordersRepository.upsertCartItem).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 2,
        unitPriceSnapshot: 120000,
      }),
    );
  });

  it('requires variantId when the offer has variants', async () => {
    const useCase = new AddCartItemUseCase(ordersRepository as never);
    ordersRepository.findOfferForOrdering.mockResolvedValue(
      createOffer({ hasVariants: true }),
    );

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1',
        offerId: 'offer-1',
        quantity: 1,
      }),
    ).rejects.toThrow('variantId is required for this offer');
  });

  it('rejects inactive or insufficient-stock variants', async () => {
    const useCase = new AddCartItemUseCase(ordersRepository as never);
    ordersRepository.findOfferForOrdering.mockResolvedValue(
      createOffer({ hasVariants: true }),
    );
    ordersRepository.findOfferVariantForCart.mockResolvedValue(
      createVariant({ isActive: false, availableQuantity: 10 }),
    );

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1',
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 1,
      }),
    ).rejects.toThrow('Variant is inactive');

    ordersRepository.findOfferVariantForCart.mockResolvedValue(
      createVariant({ availableQuantity: 1 }),
    );
    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1',
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 2,
      }),
    ).rejects.toThrow('Quantity exceeds available stock');
  });

  it('checks variant stock before updating cart item quantity', async () => {
    const useCase = new UpdateCartItemUseCase(ordersRepository as never);
    ordersRepository.findCartItemById.mockResolvedValue({
      id: 'cart-item-1',
      variantId: 'variant-1',
      cart: { buyerUserId: 'buyer-1', cartStatus: 'ACTIVE' },
    });
    ordersRepository.findOfferVariantForCart.mockResolvedValue(
      createVariant({ availableQuantity: 1 }),
    );

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1',
        cartItemId: 'cart-item-1',
        quantity: 2,
      }),
    ).rejects.toThrow('Quantity exceeds available stock');
    expect(ordersRepository.updateCartItemQuantity).not.toHaveBeenCalled();
  });
});

function createOffer(input: { hasVariants: boolean }) {
  return {
    id: 'offer-1',
    title: 'Offer 1',
    price: { toString: () => '100000' },
    currency: 'VND',
    availableQuantity: 10,
    shop: { shopName: 'Shop 1' },
    variants: input.hasVariants ? [{ id: 'variant-1' }] : [],
  };
}

function createVariant(input: {
  price?: number;
  availableQuantity?: number;
  isActive?: boolean;
}) {
  return {
    id: 'variant-1',
    offerId: 'offer-1',
    sku: 'SKU-1',
    price: { toString: () => String(input.price ?? 100000) },
    availableQuantity: input.availableQuantity ?? 10,
    isActive: input.isActive ?? true,
  };
}

function createCart() {
  return {
    id: 'cart-1',
    buyerUserId: 'buyer-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };
}
